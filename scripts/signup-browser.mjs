/**
 * Browser check for spec 007 (cadastro, teste grátis, vencimento) against local Supabase.
 * Needs `npm run db:start` and `npm run dev:staging` (port 5179). Never run against production.
 * Run: node scripts/signup-browser.mjs   (APP_URL defaults to http://127.0.0.1:5179)
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'

const status = JSON.parse(
  execFileSync('npx', ['supabase', 'status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }),
)
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(status.API_URL)) throw new Error(`Recusado: ${status.API_URL} não é local.`)
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const BASE = (process.env.APP_URL ?? 'http://127.0.0.1:5179').replace(/\/$/, '')
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(BASE)) throw new Error(`Recusado: ${BASE} não é local.`)
const OUT = join(process.cwd(), 'tmp-browser-qa')
mkdirSync(OUT, { recursive: true })

const results = []
function check(name, cond, detail = '') {
  results.push({ name, pass: Boolean(cond) })
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const EMAIL = `cadastro-${Date.now()}@teste.local`
const PASSWORD = 'teste-123456'
const SHOP = 'Vidraçaria Teste Cadastro'

async function h1(page, name) {
  await page.getByRole('heading', { level: 1, name }).waitFor()
}

async function account() {
  const { data } = await admin.from('accounts').select('*').eq('name', SHOP).single()
  return data
}

async function quoteCount(accountId) {
  const { count } = await admin.from('quotes').select('id', { count: 'exact', head: true }).eq('account_id', accountId)
  return count
}

async function signOut(page) {
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 360, height: 640 }, acceptDownloads: true })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

try {
  // Páginas públicas sem login
  await page.goto(`${BASE}/termos`, { waitUntil: 'networkidle' })
  await h1(page, 'Termos de uso')
  check('termos abrem sem login', await page.getByText('Rascunho (2026-10-10).').isVisible())
  await page.getByRole('link', { name: 'Política de Privacidade' }).first().click()
  await h1(page, 'Privacidade')
  check('link interno abre a privacidade', new URL(page.url()).pathname === '/privacidade')
  await page.getByRole('button', { name: 'Voltar' }).click()
  await h1(page, 'Termos de uso')
  await page.getByRole('button', { name: 'Voltar' }).click()
  await page.getByRole('button', { name: 'Criar conta grátis' }).waitFor()
  check('voltar sem login chega na entrada', new URL(page.url()).pathname === '/')
  check('sem horizontal scroll na entrada', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))

  // Cadastro por e-mail
  await page.getByRole('button', { name: 'Criar conta grátis' }).click()
  await h1(page, 'Criar conta grátis')
  check('Google escondido quando desligado', (await page.getByRole('button', { name: 'Continuar com Google' }).count()) === 0)
  await page.getByLabel('E-mail').fill(EMAIL)
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
  await h1(page, 'Sua vidraçaria')
  check('login novo cai em "Sua vidraçaria"', true)

  await page.getByLabel('Nome da vidraçaria').fill(SHOP)
  await page.getByLabel('WhatsApp da loja').fill('37999990000')
  check('WhatsApp com máscara', (await page.getByLabel('WhatsApp da loja').inputValue()) === '(37) 99999-0000')
  check('opt-in desmarcado', !(await page.getByLabel('Quero receber novidades e ofertas pelo WhatsApp').isChecked()))
  await page.getByRole('button', { name: 'Começar teste grátis de 30 dias' }).click()
  await h1(page, 'Início')
  check('teste de 30 dias no Início', await page.getByText('Teste grátis: faltam 30 dias').isVisible())
  const acc = await account()
  check('conta criada em teste', acc?.plan === 'trial' && acc.whatsapp === '37999990000' && !acc.marketing_opt_in_at)

  // Primeiros passos: catálogo de exemplo, loja já cadastrada
  const card = page.locator('.home .onboarding')
  const closeCard = card.getByRole('button', { name: 'Fechar primeiros passos' })
  check('card de primeiros passos', await card.isVisible())
  check('loja já conta como feita', (await card.locator('.pill').innerText()) === '1 de 5')
  const vidrosTask = card.getByRole('button', { name: /Seus vidros/ })
  check('card nasce aberto com o X', (await vidrosTask.isVisible()) && (await closeCard.isVisible()))
  check('próximo passo em destaque', (await vidrosTask.getAttribute('class')).includes('onboarding__task--next'))
  await page.screenshot({ path: join(OUT, 'onboarding-aberto.png') })
  await card.locator('summary').click()
  await closeCard.waitFor({ state: 'detached' })
  await vidrosTask.waitFor({ state: 'hidden' })
  check('card recolhido esconde tarefas e X', true)
  await page.screenshot({ path: join(OUT, 'onboarding-fechado.png') })
  await page.goto(`${BASE}/orcamentos`, { waitUntil: 'networkidle' })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await h1(page, 'Início')
  check('recolhido continua recolhido na sessão', (await closeCard.count()) === 0)
  await card.locator('summary').click()
  await closeCard.waitFor()
  await page.goto(`${BASE}/orcamentos`, { waitUntil: 'networkidle' })
  const strip = page.locator('.next-step')
  check('faixa do próximo passo em Orçamentos', /Próximo: Seus vidros/.test(await strip.innerText()))
  await page.screenshot({ path: join(OUT, 'proximo-passo.png') })
  await strip.click()
  await page.waitForURL(/\/catalogo\/vidros$/)
  check('faixa some na tela da própria tarefa', (await strip.count()) === 0)
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await h1(page, 'Início')
  check('Início sem faixa (o card já guia)', (await strip.count()) === 0)
  await vidrosTask.click()
  await page.waitForURL(/\/catalogo\/vidros$/)
  const examples = page.getByText(/preços? ainda (é|são) de exemplo/)
  const pendingCount = async () => Number((await examples.innerText()).match(/\d+/)?.[0] ?? 0)
  const examplesBefore = await pendingCount()
  check('vidros com aviso de exemplo', examplesBefore > 0, String(examplesBefore))
  const firstPrice = page.locator('.catalog-table .money-input').first()
  check('preço de exemplo marcado', (await firstPrice.getAttribute('class')).includes('money-input--exemplo'))
  await page.screenshot({ path: join(OUT, 'onboarding-vidros.png') })
  await firstPrice.fill('123,00')
  await firstPrice.blur()
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await page.getByText(/Catálogo salvo/).waitFor()
  check('preço editado deixa de ser exemplo', !(await firstPrice.getAttribute('class')).includes('money-input--exemplo'))
  check('contador cai um', (await pendingCount()) === examplesBefore - 1)

  await page.goto(`${BASE}/catalogo/configuracao`, { waitUntil: 'networkidle' })
  await page.getByText('Mão de obra e margem ainda são de exemplo.', { exact: false }).waitFor()
  await page.getByRole('button', { name: 'Confirmar preços' }).click()
  await page.getByText(/Preços confirmados/).waitFor()
  check('confirmar tira o aviso', (await page.getByRole('button', { name: 'Confirmar preços' }).count()) === 0)
  const stripText = await strip.innerText()
  check('faixa: feito e próximo', /Feito: Mão de obra e margem/.test(stripText) && /Próximo: Seus vidros/.test(stripText), stripText)
  await page.screenshot({ path: join(OUT, 'proximo-passo-feito.png') })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await h1(page, 'Início')
  check('mão de obra conta como feita', (await card.locator('.pill').innerText()) === '2 de 5')

  // Configurações preenchidas com a conta, sem o logo da Forte Vidros
  await page.goto(`${BASE}/configuracoes/conta`, { waitUntil: 'networkidle' })
  await page.getByLabel('Nome / razão social').waitFor()
  check('nome da loja vem do cadastro', (await page.getByLabel('Nome / razão social').inputValue()) === SHOP)
  check('telefone vem do cadastro', (await page.getByLabel('Telefone').first().inputValue()) === '(37) 99999-0000')
  await page.goto(`${BASE}/configuracoes/logo`, { waitUntil: 'networkidle' })
  check('conta nova sem logo', await page.getByText('Sem logo').isVisible())

  // Orçamento emitido para os testes de vencimento
  await page.goto(`${BASE}/orcamentos`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Novo orçamento' }).click()
  await page.getByRole('heading', { level: 1, name: /^ORC-/ }).waitFor()
  check('primeiro número da conta', /^ORC-\d{4}-0001/.test(await page.getByRole('heading', { level: 1 }).innerText()))
  await page.getByRole('button', { name: 'Adicionar item' }).click()
  await page.getByRole('button', { name: 'Espelho', exact: true }).click()
  const modal = page.locator('.modal--item')
  await modal.getByLabel('Largura (mm)').fill('1000')
  await modal.getByLabel('Altura (mm)').fill('800')
  await modal.getByRole('button', { name: 'Adicionar item' }).click()
  await modal.waitFor({ state: 'detached' })
  await page.locator('#customer-name').fill('Cliente Cadastro')
  const draftUrl = page.url()
  await page.getByRole('button', { name: 'Emitir' }).click()
  const examplePop = page.getByRole('dialog', { name: 'Preços de exemplo' })
  await examplePop.waitFor()
  check('emitir avisa preço de exemplo', /usa preços de exemplo \(vidros\)/.test(await examplePop.innerText()))
  await page.screenshot({ path: join(OUT, 'onboarding-emitir.png') })
  await examplePop.getByRole('button', { name: 'Revisar' }).click()
  await page.waitForURL(/\/catalogo\/vidros$/)
  check('Revisar abre a aba do vidro', true)
  await page.goto(draftUrl, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Emitir' }).click()
  await examplePop.getByRole('button', { name: 'Emitir assim' }).click()
  await page.getByText('Emitido', { exact: true }).waitFor()
  const emittedUrl = page.url()
  check('emite com a conta em teste', true)

  // Dicas: revisão logo após emitir, lixeira na primeira revisão
  const reviseTip = page.getByRole('dialog', { name: 'Criar uma revisão' })
  await reviseTip.waitFor()
  check('dica de revisão após emitir', await reviseTip.getByRole('button', { name: 'Entendi' }).isVisible())
  check('dica cabe na tela', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await page.screenshot({ path: join(OUT, 'dica-revisao.png') })
  await page.getByRole('button', { name: 'Criar uma revisão' }).first().click()
  await page.getByText('Rascunho', { exact: true }).waitFor()
  check('revisão criada', /-2$/.test(await page.getByRole('heading', { level: 1 }).innerText()))
  const deleteTip = page.getByRole('dialog', { name: 'Desistir de uma revisão' })
  await deleteTip.waitFor()
  check('dica da lixeira na revisão', (await reviseTip.count()) === 0)
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(OUT, 'dica-lixeira.png') })
  await deleteTip.getByRole('button', { name: 'Entendi' }).click()
  await deleteTip.waitFor({ state: 'detached' })
  const revUrl = page.url()
  await page.getByRole('button', { name: 'Excluir rascunho' }).click()
  await page.getByRole('dialog', { name: 'Excluir rascunho' }).getByRole('button', { name: 'Sim' }).click()
  await page.waitForURL((url) => url.href !== revUrl)
  await page.goto(emittedUrl, { waitUntil: 'networkidle' })
  await page.getByText('Emitido', { exact: true }).waitFor()
  check('dica não volta depois de vista', (await reviseTip.count()) === 0)

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await h1(page, 'Início')
  check('primeiro orçamento conta como feito', (await card.locator('.pill').innerText()) === '3 de 5')
  await closeCard.waitFor()
  await page.screenshot({ path: join(OUT, 'onboarding-inicio.png') })
  const dismiss = page.getByRole('dialog', { name: 'Fechar primeiros passos?' })
  await closeCard.click()
  await dismiss.waitFor()
  check('X pergunta antes de fechar', (await card.locator('summary').count()) === 1)
  await page.screenshot({ path: join(OUT, 'onboarding-dispensar.png') })
  await dismiss.getByRole('button', { name: 'Fechar' }).click()
  await dismiss.waitFor({ state: 'detached' })
  check('Fechar no aviso mantém o card', await card.isVisible())
  await closeCard.click()
  await dismiss.getByRole('button', { name: 'Dispensar desta vez' }).click()
  await card.waitFor({ state: 'detached' })
  await page.reload({ waitUntil: 'networkidle' })
  await h1(page, 'Início')
  check('desta vez: some até abrir o app de novo', (await card.count()) === 0)
  const again = await browser.newContext({
    storageState: await page.context().storageState(),
    viewport: { width: 360, height: 640 },
  })
  const reopened = await again.newPage()
  await reopened.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await h1(reopened, 'Início')
  const card2 = reopened.locator('.home .onboarding')
  check('desta vez: volta ao abrir o app', await card2.isVisible())
  await card2.getByRole('button', { name: 'Fechar primeiros passos' }).click()
  await reopened.getByRole('dialog').getByRole('button', { name: 'Dispensar para sempre' }).click()
  await card2.waitFor({ state: 'detached' })
  let dismissedAt
  for (let i = 0; i < 25 && !dismissedAt; i++) {
    const { data } = await admin.from('settings').select('payload').eq('account_id', acc.id).single()
    dismissedAt = data?.payload?.onboardingDismissedAt
    if (!dismissedAt) await reopened.waitForTimeout(200)
  }
  check('para sempre: gravado no cadastro', Boolean(dismissedAt))
  await again.close()
  await page.goto(`${BASE}/configuracoes/conta`, { waitUntil: 'networkidle' })
  const pendingList = page.getByRole('region', { name: 'Primeiros passos' })
  check(
    'dispensado: pendências em Conta',
    (await pendingList.getByRole('button').count()) === 2,
    await pendingList.innerText().catch(() => ''),
  )

  // Aviso de 7 dias
  await admin.from('accounts').update({ trial_ends_at: new Date(Date.now() + 6 * 864e5).toISOString() }).eq('id', acc.id)
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await h1(page, 'Início')
  check('aviso a 6 dias', await page.getByText('Seu teste grátis termina em 6 dias.').isVisible())
  check('aviso oferece assinar', await page.getByRole('link', { name: 'Quero assinar' }).isVisible())

  // Vencido: só consulta
  await admin.from('accounts').update({ trial_ends_at: new Date(Date.now() - 864e5).toISOString() }).eq('id', acc.id)
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await h1(page, 'Início')
  check('banner de vencido sem falar de preço', await page.getByText(/Seu teste grátis terminou em .*Seus orçamentos continuam aqui/).isVisible())
  const before = await quoteCount(acc.id)
  await page.goto(`${BASE}/orcamentos`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Novo orçamento' }).click()
  await page.getByRole('dialog', { name: 'Seu teste grátis terminou' }).waitFor()
  check('Novo orçamento abre o aviso', true)
  check('aviso oferece assinar', await page.getByRole('dialog').getByRole('link', { name: 'Quero assinar' }).isVisible())
  check('sem horizontal scroll no aviso', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  check('nenhum rascunho criado', (await quoteCount(acc.id)) === before && new URL(page.url()).pathname === '/orcamentos')

  // Vencido ainda fala com a gente e manda sugestão
  await page.getByRole('button', { name: 'Novo orçamento' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Falar com a gente' }).click()
  await h1(page, 'Suporte')
  check('aviso leva ao Suporte', new URL(page.url()).pathname === '/suporte/fale-com-a-gente')
  await page.getByLabel('O que faria o app melhor para você?').fill('Enviar orçamento por e-mail também')
  await page.getByRole('button', { name: 'Enviar', exact: true }).click()
  await page.getByText('Recebemos sua sugestão. Obrigado!').waitFor()
  check('sugestão enviada com a conta vencida', await page.locator('.suggestions__item').filter({ hasText: 'por e-mail' }).isVisible())

  await page.goto(emittedUrl, { waitUntil: 'networkidle' })
  await page.getByText('Emitido', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Criar uma revisão' }).click()
  await page.getByRole('dialog', { name: 'Seu teste grátis terminou' }).waitFor()
  check('Revisar abre o aviso', true)
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  check('revisão não criada', (await quoteCount(acc.id)) === before)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('.action-bar').getByRole('button', { name: 'Baixar PDF' }).click(),
  ])
  check('PDF baixa com a conta vencida', /\.pdf$/.test(download.suggestedFilename()), download.suggestedFilename())

  await page.goto(`${BASE}/configuracoes/conta`, { waitUntil: 'networkidle' })
  await page.getByLabel('Nome / razão social').fill(`${SHOP} 2`)
  await page.getByRole('button', { name: 'Salvar' }).first().click()
  await page.getByRole('dialog', { name: 'Seu teste grátis terminou' }).waitFor()
  check('salvar configurações abre o aviso', true)
  await page.keyboard.press('Escape')
  const settings = await admin.from('settings').select('payload').eq('account_id', acc.id).single()
  check('configurações não gravadas', settings.data?.payload?.establishment?.name === SHOP)

  // Sair e entrar de novo cai na mesma conta
  await admin.from('accounts').update({ trial_ends_at: new Date(Date.now() + 30 * 864e5).toISOString() }).eq('id', acc.id)
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await h1(page, 'Início')
  await signOut(page)
  await page.getByRole('button', { name: 'Já tenho conta' }).click()
  await page.getByLabel('E-mail').fill(EMAIL)
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await h1(page, 'Início')
  check('entrar de novo cai na mesma conta', await page.getByText('Teste grátis: faltam 30 dias').isVisible())

  // Suporte: bloco do Início, WhatsApp e resposta da sugestão
  await page.getByRole('button', { name: 'Suporte: Fale com a gente, explore dicas e novidades' }).click()
  await h1(page, 'Suporte')
  const wa = await page.getByRole('link', { name: 'Conversar no WhatsApp' }).getAttribute('href')
  check('WhatsApp do suporte com a loja', wa.startsWith('https://wa.me/5537999170088?') && decodeURIComponent(wa).includes(SHOP), wa)
  await admin
    .from('suggestions')
    .update({ status: 'feita', reply: 'Já está no app!', replied_at: new Date().toISOString(), shipped_version: '2026-10-14' })
    .eq('account_id', acc.id)
  await page.reload({ waitUntil: 'networkidle' })
  const item = page.locator('.suggestions__item').first()
  await item.getByText('Já está no app!').waitFor()
  check('resposta e versão aparecem', (await item.innerText()).includes('Feita na versão 2026-10-14'))
  check('sem horizontal scroll no Suporte', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await page.screenshot({ path: join(OUT, 'ajuda.png'), fullPage: true })
  await page.getByRole('tab', { name: 'Dicas' }).click()
  const tips = page.getByRole('tabpanel')
  const tipsText = await tips.innerText()
  check('Suporte lista as dicas', /Criar uma revisão de orçamento/.test(tipsText) && /Excluir rascunho de orçamento/.test(tipsText))
  await tips.getByRole('button', { name: 'Mostrar as dicas de novo' }).click()
  await tips.getByText('Pronto: as dicas voltam').waitFor()
  await page.goto(emittedUrl, { waitUntil: 'networkidle' })
  await reviseTip.waitFor()
  check('dicas voltam depois de pedir no Suporte', true)

  // Opt-in em Conta
  await page.goto(`${BASE}/configuracoes/conta`, { waitUntil: 'networkidle' })
  const optIn = page.getByLabel('Quero receber novidades e ofertas pelo WhatsApp')
  await optIn.check()
  await page.waitForTimeout(500)
  check('opt-in gravado', Boolean((await account())?.marketing_opt_in_at))

  // Rodapé: novidades, versão, excluir conta
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await h1(page, 'Início')
  const footer = page.locator('.home-footer')
  const tiles = await page.locator('.tile-grid').boundingBox()
  check('blocos cabem em 360×640 com o rodapé', tiles.y + tiles.height <= 640, String(tiles.y + tiles.height))
  await page.screenshot({ path: join(OUT, 'inicio-rodape.png'), fullPage: true })
  check('rodapé mostra a data da versão', /Última atualização: \d{2}\/\d{2}\/\d{4}/.test(await footer.innerText()))
  await footer.getByRole('link', { name: 'Veja as novidades' }).click()
  await h1(page, 'Suporte')
  check('novidades no Suporte', new URL(page.url()).pathname === '/suporte/novidades')
  check('mês mais recente aberto', await page.locator('.support__news details[open]').count() === 1)
  await page.getByRole('button', { name: 'Voltar' }).click()
  await h1(page, 'Início')
  await page.goto(`${BASE}/configuracoes/conta`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Excluir minha conta e dados' }).click()
  const pop = page.getByRole('dialog', { name: 'Excluir conta e dados?' })
  check('excluir pede a palavra', await pop.getByRole('button', { name: 'Excluir tudo' }).isDisabled())
  await pop.getByLabel('Digite EXCLUIR para confirmar').fill('excluir')
  await page.screenshot({ path: join(OUT, 'excluir-conta.png'), fullPage: true })
  await pop.getByRole('button', { name: 'Excluir tudo' }).click()
  await page.getByRole('button', { name: 'Criar conta grátis' }).waitFor()
  const gone = await admin.from('accounts').select('id').eq('id', acc.id)
  const users = await admin.auth.admin.listUsers()
  check('conta e login excluídos', gone.data?.length === 0 && !users.data?.users.some((u) => u.email === EMAIL))

  check('sem erros de página', errors.length === 0, errors.join(' | '))
} catch (error) {
  await page.screenshot({ path: join(OUT, 'signup-browser-fail.png'), fullPage: true }).catch(() => {})
  check('roteiro completo', false, error instanceof Error ? error.message : String(error))
} finally {
  await browser.close()
  const users = await admin.auth.admin.listUsers()
  const user = users.data?.users.find((u) => u.email === EMAIL)
  if (user) {
    await admin.from('accounts').delete().eq('name', SHOP)
    await admin.auth.admin.deleteUser(user.id)
  }
}

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} ok`)
process.exit(failed.length ? 1 : 0)

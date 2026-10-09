/**
 * Browser check for specs 005/006: device back closes overlays, walks screens down to Início,
 * per-screen URLs, reload, deep links, leave guard, item draft, Início tiles and banner carousel.
 * `page.goBack()` fires the same popstate as the Android back button.
 * Needs a dev server in local mode (no Supabase):
 *   VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run dev -- --host 127.0.0.1
 * Run: APP_URL=http://127.0.0.1:5173 node scripts/nav-back-browser.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = (process.env.APP_URL ?? 'http://127.0.0.1:5173').replace(/\/$/, '')
const OUT = join(process.cwd(), 'tmp-browser-qa')
mkdirSync(OUT, { recursive: true })

const results = []
function ok(name, detail = '') {
  results.push({ name, pass: true, detail })
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`)
}
function fail(name, detail) {
  results.push({ name, pass: false, detail })
  console.error(`FAIL  ${name} — ${detail}`)
}
function check(name, cond, detail = '') {
  if (cond) ok(name, detail)
  else fail(name, detail || 'condição falsa')
}

const path = (page) => {
  const url = new URL(page.url())
  return url.origin === new URL(BASE).origin ? url.pathname + url.search : page.url()
}

async function back(page) {
  await page.goBack({ waitUntil: 'commit' }).catch(() => {})
  await page.waitForTimeout(350)
}

async function heading(page, name) {
  await page.getByRole('heading', { name, level: 1 }).waitFor()
}

async function pick(page, label, option) {
  await page.getByRole('button', { name: new RegExp(`^${label}`) }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

async function addMirror(page) {
  await page.getByRole('button', { name: 'Adicionar item' }).click()
  await page.getByRole('button', { name: 'Espelho', exact: true }).click()
  const modal = page.locator('.modal--item')
  await modal.getByLabel('Largura (mm)').fill('1000')
  await modal.getByLabel('Altura (mm)').fill('800')
  await modal.getByRole('button', { name: 'Adicionar item' }).click()
  await modal.waitFor({ state: 'detached' })
}

async function overlays(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await heading(page, 'Início')
  ok('abre no Início', path(page))

  await page.getByRole('button', { name: 'Novo orçamento' }).click()
  await page.getByText('Rascunho', { exact: true }).waitFor()
  const quoteUrl = path(page)
  check('orçamento tem endereço próprio', /^\/orcamentos\/[^/]+$/.test(quoteUrl), quoteUrl)
  await addMirror(page)

  await page.getByRole('button', { name: 'Adicionar item' }).click()
  await page.getByRole('heading', { name: 'Tipo do item' }).waitFor()
  await back(page)
  check(
    'voltar fecha seletor de tipo',
    (await page.locator('.modal').count()) === 0 && path(page) === quoteUrl,
    path(page),
  )

  await page.getByRole('button', { name: 'Adicionar item' }).click()
  await page.getByRole('button', { name: 'Espelho', exact: true }).click()
  await page.locator('.modal--item').waitFor()
  await back(page)
  check(
    'voltar fecha formulário sem reabrir o seletor',
    (await page.locator('.modal').count()) === 0 && path(page) === quoteUrl,
  )

  await page.getByRole('button', { name: 'Detalhes do custo' }).first().click()
  await page.locator('.modal--cost').waitFor()
  await back(page)
  check('voltar fecha Detalhes do custo', (await page.locator('.modal').count()) === 0)

  await page.getByRole('button', { name: 'Excluir rascunho' }).click()
  await page.getByRole('dialog', { name: 'Excluir rascunho' }).waitFor()
  await back(page)
  check(
    'voltar fecha confirmação pequena',
    (await page.getByRole('dialog', { name: 'Excluir rascunho' }).count()) === 0 && path(page) === quoteUrl,
  )

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('menu').waitFor()
  await back(page)
  check('voltar fecha o menu', (await page.getByRole('menu').count()) === 0 && path(page) === quoteUrl)

  await page.getByRole('button', { name: 'Adicionar item' }).click()
  await page.getByRole('heading', { name: 'Tipo do item' }).waitFor()
  await page.locator('.modal').getByRole('button', { name: 'Fechar' }).click()
  await page.locator('.modal').waitFor({ state: 'detached' })
  await page.waitForTimeout(200)
  await back(page)
  await heading(page, 'Início')
  ok('fechar pelo botão e voltar: um toque leva ao Início')

  await page.goForward({ waitUntil: 'commit' })
  await page.getByText('Rascunho', { exact: true }).waitFor()
  check('avançar reabre o orçamento', path(page) === quoteUrl, path(page))

  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await heading(page, 'Início')
  ok('seta do orçamento volta ao Início')
  await back(page)
  check('voltar no Início sai do app', !page.url().startsWith(BASE), page.url())
  return quoteUrl
}

async function screens(page, quoteUrl) {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await heading(page, 'Início')
  await page.getByRole('button', { name: /^Orçamentos:/ }).click()
  await heading(page, 'Orçamentos')
  await pick(page, 'Filtrar por status', /^Rascunhos/)
  await page.waitForTimeout(500)
  check('filtro vai para o endereço', path(page).includes('filtro=rascunhos'), path(page))
  await page.locator('.quote-card').first().click()
  await page.getByText('Rascunho', { exact: true }).waitFor()
  await back(page)
  await heading(page, 'Orçamentos')
  check(
    'voltar do orçamento mantém o filtro da lista',
    path(page).includes('filtro=rascunhos') &&
      (await page.getByRole('button', { name: /^Filtrar por status: Rascunhos/ }).count()) === 1,
    path(page),
  )
  await back(page)
  await heading(page, 'Início')
  ok('voltar da lista vai ao Início')

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('menuitem', { name: 'Catálogo' }).click()
  await heading(page, 'Catálogo')
  check('catálogo tem endereço', path(page) === '/catalogo/vidros', path(page))
  await pick(page, 'Tabela do catálogo', 'Alumínios')
  await page.waitForTimeout(300)
  check('aba do catálogo no endereço', path(page) === '/catalogo/aluminios', path(page))
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Alumínios', level: 2, exact: true }).waitFor()
  ok('recarregar mantém a tabela do catálogo')

  const money = page.locator('.catalog-table .money-input').first()
  await money.fill('7,77')
  await money.blur()
  let asked = 0
  page.once('dialog', (d) => {
    asked += 1
    void d.dismiss()
  })
  await back(page)
  check('alteração não salva pergunta antes de sair', asked === 1)
  check('cancelar fica no catálogo', path(page) === '/catalogo/aluminios', path(page))
  page.once('dialog', (d) => {
    asked += 1
    void d.accept()
  })
  await back(page)
  await heading(page, 'Início')
  check('confirmar descarta e vai ao Início (abas não são passos)', asked === 2)

  await page.goto(`${BASE}${quoteUrl}`, { waitUntil: 'networkidle' })
  await page.getByText('Rascunho', { exact: true }).waitFor()
  ok('endereço direto abre o orçamento')
  await back(page)
  await heading(page, 'Orçamentos')
  await back(page)
  await heading(page, 'Início')
  ok('endereço direto: voltar sobe Orçamentos → Início')

  await page.goto(`${BASE}/orcamentos/nao-existe`, { waitUntil: 'networkidle' })
  await page.getByText('Orçamento não encontrado.').waitFor()
  check('orçamento inexistente cai na lista com aviso', path(page) === '/orcamentos', path(page))
}

async function itemDrafts(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Novo orçamento' }).click()
  await page.getByText('Rascunho', { exact: true }).waitFor()
  await addMirror(page)
  const modal = page.locator('.modal--item')
  const banner = page.locator('.item-draft-banner')
  const total = () => page.locator('.action-bar__total').innerText()

  await page.getByRole('button', { name: 'Adicionar item' }).click()
  await page.getByRole('button', { name: 'Espelho', exact: true }).click()
  await back(page)
  check('só escolher o tipo e voltar não cria rascunho', (await banner.count()) === 0)

  await page.getByRole('button', { name: 'Adicionar item' }).click()
  await page.getByRole('button', { name: 'Espelho', exact: true }).click()
  await modal.getByLabel('Largura (mm)').fill('1234')
  await back(page)
  await banner.waitFor()
  check('voltar com medida guarda item em rascunho', (await banner.innerText()).includes('Item não terminado: Espelho'))

  await banner.getByRole('button', { name: 'Continuar' }).click()
  check('continuar reabre com o valor digitado', (await modal.getByLabel('Largura (mm)').inputValue()) === '1234')
  await page.keyboard.press('Escape')
  await modal.waitFor({ state: 'detached' })
  await page.reload({ waitUntil: 'networkidle' })
  await banner.waitFor()
  ok('rascunho do item sobrevive ao recarregar')
  await page.getByRole('button', { name: 'Adicionar item' }).click()
  check(
    'Adicionar item abre o rascunho direto',
    (await modal.getByLabel('Largura (mm)').inputValue()) === '1234',
  )
  await modal.getByRole('button', { name: 'Cancelar' }).click()
  await modal.waitFor({ state: 'detached' })
  check('Cancelar descarta o rascunho', (await banner.count()) === 0)

  const before = await total()
  await page.getByRole('button', { name: 'Editar' }).first().click()
  await modal.getByLabel('Largura (mm)').fill('999')
  await back(page)
  check('voltar na edição não muda o total', (await total()) === before, before)
  await page.getByRole('button', { name: 'Editar' }).first().click()
  check(
    'reabrir a edição mostra a alteração guardada',
    (await modal.getByLabel('Largura (mm)').inputValue()) === '999' &&
      (await modal.getByText('Alterações não salvas recuperadas.').count()) === 1,
  )
  await modal.getByRole('button', { name: 'Descartar alterações' }).click()
  check('descartar alterações volta ao item', (await modal.getByLabel('Largura (mm)').inputValue()) === '1000')
  await back(page)
}

async function home(browser) {
  const context = await browser.newContext({ viewport: { width: 360, height: 640 } })
  const page = await context.newPage()
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await heading(page, 'Início')
  const tiles = page.locator('.tile')
  const last = await tiles.last().boundingBox()
  const bar = await page.locator('.action-bar').boundingBox()
  check(
    '360×640: carrossel e duas linhas de blocos sem rolar',
    last && bar && last.y + last.height <= bar.y + 1,
    `bloco termina em ${Math.round(last?.y + last?.height)}, barra em ${Math.round(bar?.y)}`,
  )
  await page.screenshot({ path: join(OUT, 'home-360.png') })

  const current = () => page.locator('.carousel__dot[aria-current="true"]').getAttribute('aria-label')
  const first = await current()
  await page.waitForTimeout(5600)
  const second = await current()
  check('banner troca sozinho em 5 s', first !== second, `${first} → ${second}`)

  const slide = page.locator('.carousel__track')
  const box = await slide.boundingBox()
  await page.mouse.move(box.x + 20, box.y + 20)
  await page.mouse.down()
  const held = await current()
  await page.waitForTimeout(5600)
  check('segurar o banner pausa a troca', (await current()) === held)
  await page.mouse.up()
  await context.close()

  const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  const still = await reduced.newPage()
  await still.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  const before = await still.locator('.carousel__dot[aria-current="true"]').getAttribute('aria-label')
  await still.waitForTimeout(5600)
  check(
    'reduzir movimento: sem troca automática',
    (await still.locator('.carousel__dot[aria-current="true"]').getAttribute('aria-label')) === before,
  )
  await reduced.close()
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  const pageErrors = []
  page.on('pageerror', (err) => pageErrors.push(err.message))

  try {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    if (await page.getByLabel(/senha/i).count()) {
      throw new Error('tela de login: servidor está em modo Supabase, rode em modo local')
    }
    const quoteUrl = await overlays(page)
    await screens(page, quoteUrl)
    await itemDrafts(page)
    await home(browser)
    check('sem erros de página', pageErrors.length === 0, pageErrors.join(' | '))
  } catch (err) {
    const shot = join(OUT, 'nav-back-failure.png')
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {})
    fail('exception', `${err.message} (shot ${shot})`)
  } finally {
    await browser.close()
  }

  const passed = results.filter((r) => r.pass).length
  const failed = results.length - passed
  console.log(`\n${passed} passed, ${failed} failed`)
  writeFileSync(join(OUT, 'nav-back-results.json'), JSON.stringify(results, null, 2))
  process.exit(failed ? 1 : 0)
}

main()

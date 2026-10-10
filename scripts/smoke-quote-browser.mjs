/**
 * Browser smoke: Início → Orçamentos → novo orçamento → item → detalhes do custo → nome → emitir → prévia e download do PDF.
 * Needs a dev server in local mode (no Supabase):
 *   VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run dev -- --host 127.0.0.1
 * Run: APP_URL=http://127.0.0.1:5173 node scripts/smoke-quote-browser.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5173'
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

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  const pageErrors = []
  page.on('pageerror', (err) => pageErrors.push(err.message))

  try {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    if (await page.getByLabel(/senha/i).count()) {
      throw new Error('tela de login: servidor está em modo Supabase, rode em modo local')
    }

    await page.getByRole('button', { name: /^Orçamentos:/ }).click()
    await page.getByRole('heading', { name: 'Orçamentos', level: 1 }).waitFor()
    await page.getByRole('button', { name: 'Novo orçamento' }).click()
    await page.getByRole('heading', { level: 1, name: /^ORC-/ }).waitFor()
    ok('criar rascunho')
    check(
      'emitir bloqueado sem itens',
      await page.getByRole('button', { name: 'Emitir' }).isDisabled(),
    )

    await page.getByRole('button', { name: 'Adicionar item' }).click()
    await page.getByRole('heading', { name: 'Tipo do item' }).waitFor()
    await page.getByRole('button', { name: 'Espelho', exact: true }).click()
    const modal = page.locator('.modal--item')
    await modal.getByLabel('Largura (mm)').fill('1000')
    await modal.getByLabel('Altura (mm)').fill('800')
    await modal.getByRole('button', { name: 'Adicionar item' }).click()
    await modal.waitFor({ state: 'detached' })
    const items = page.locator('article.item-block')
    check('item adicionado', (await items.count()) === 1, `${await items.count()} item(ns)`)

    const total = (await page.locator('.action-bar').innerText()).match(/R\$\s*([\d.,]+)/)?.[1]
    check('total maior que zero', Boolean(total) && total !== '0,00', `R$ ${total}`)

    await items.first().getByRole('button', { name: 'Detalhes do custo' }).click()
    const cost = page.locator('.modal--cost')
    await cost.getByRole('region', { name: 'Vidro' }).waitFor()
    check(
      'detalhes do custo lista linhas',
      (await cost.locator('.cost-line').count()) >= 2,
      `${await cost.locator('.cost-line').count()} linha(s)`,
    )
    await page.keyboard.press('Escape')
    await cost.waitFor({ state: 'detached' })
    ok('detalhes do custo fecha')

    await page.getByRole('button', { name: 'Emitir' }).click()
    await page.getByRole('alertdialog', { name: 'Nome do cliente obrigatório' }).waitFor()
    ok('emitir sem nome pede o nome')
    await page.getByRole('button', { name: 'Preencher nome' }).click()
    await page.locator('#customer-name').fill('Cliente Smoke')
    await page.getByRole('button', { name: 'Emitir' }).click()
    await page.getByText('Emitido', { exact: true }).waitFor()
    ok('emitir com nome')

    await page.getByRole('button', { name: 'Prévia do PDF' }).click()
    const preview = page.locator('.modal--pdf')
    await preview.locator('canvas').first().waitFor()
    ok('prévia do PDF renderiza')
    await preview.getByRole('button', { name: 'Enviar' }).click()
    const sheet = page.locator('.send-pop')
    await sheet.waitFor()
    ok('Enviar na prévia abre o menu de envio')

    check('envio tem PDF e texto', (await sheet.locator('.send-option').count()) === 2)
    await sheet.getByRole('menuitem', { name: /^Enviar texto/ }).click()
    const zap = page.locator('.modal--zap')
    await zap.getByText('Cliente Smoke', { exact: false }).first().waitFor()
    ok('Enviar texto abre prévia da mensagem')
    await page.keyboard.press('Escape')
    await zap.waitFor({ state: 'detached' })

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.action-bar').getByRole('button', { name: 'Baixar PDF' }).click(),
    ])
    const filename = download.suggestedFilename()
    const pdfPath = join(OUT, filename)
    await download.saveAs(pdfPath)
    check('nome do PDF', /^\d{4}-\d{4}-1-Cliente\.pdf$/.test(filename), filename)
    check('arquivo é PDF', readFileSync(pdfPath).subarray(0, 4).toString() === '%PDF', pdfPath)

    await page.getByRole('button', { name: 'Voltar', exact: true }).click()
    await page.getByRole('heading', { name: 'Orçamentos', level: 1 }).waitFor()
    ok('voltar do orçamento volta à lista')
    check(
      'lista mostra emitido',
      (await page.getByText('Cliente Smoke').count()) > 0,
    )

    check('sem erros de página', pageErrors.length === 0, pageErrors.join(' | '))
    await page.screenshot({ path: join(OUT, 'smoke-quote-final.png'), fullPage: true })
  } catch (err) {
    const shot = join(OUT, 'smoke-quote-failure.png')
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {})
    fail('exception', `${err.message} (shot ${shot})`)
  } finally {
    await browser.close()
  }

  const passed = results.filter((r) => r.pass).length
  const failed = results.length - passed
  console.log(`\n${passed} passed, ${failed} failed`)
  writeFileSync(join(OUT, 'smoke-quote-results.json'), JSON.stringify(results, null, 2))
  process.exit(failed ? 1 : 0)
}

main()

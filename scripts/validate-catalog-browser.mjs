/**
 * Browser QA: Catálogo (editar preço, salvar, novo vidro, busca, desativar/reativar,
 * filtro de situação, troca de tabela, resetar mudanças).
 * Needs a dev server in local mode (no Supabase):
 *   VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run dev -- --host 127.0.0.1
 * Run: APP_URL=http://127.0.0.1:5173 node scripts/validate-catalog-browser.mjs
 * Each run uses a fresh browser context, so the local IndexedDB starts from the seed.
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
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

async function pick(page, label, option) {
  await page.getByRole('button', { name: new RegExp(`^${label}`) }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
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

    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('menuitem', { name: 'Catálogo' }).click()
    await page.getByRole('heading', { name: 'Catálogo', level: 1 }).waitFor()
    ok('abrir catálogo pelo menu')

    const saveBtn = page.locator('footer.action-bar .btn.primary')
    check('sem mudanças mostra Salvo', (await saveBtn.innerText()).trim() === 'Salvo')

    const money = page.locator('.catalog-table .money-input').first()
    await money.fill('199,99')
    await money.blur()
    check(
      'editar preço habilita Salvar',
      (await saveBtn.innerText()).trim() === 'Salvar' && (await saveBtn.isEnabled()),
    )
    await saveBtn.click()
    await page.locator('.banner.ok').filter({ hasText: 'Catálogo salvo' }).waitFor()
    ok('salvar após edição')

    await page.getByRole('button', { name: 'Adicionar vidro' }).click()
    const modal = page.locator('.modal')
    await modal.getByRole('heading', { name: 'Novo vidro' }).waitFor()
    await modal.getByLabel('Código').fill('QA-VIDRO-01')
    await modal.getByLabel('Tipo').fill('Temperado')
    await modal.getByLabel('Cor').fill('QATest')
    await modal.getByLabel('Espessura (mm)').fill('08')
    await modal.getByLabel('R$/m²').fill('123,45')
    await modal.getByRole('button', { name: 'Adicionar vidro' }).click()
    await modal.waitFor({ state: 'detached' })
    await page.getByRole('cell', { name: 'QA-VIDRO-01', exact: true }).waitFor()
    ok('criar vidro')

    await saveBtn.click()
    await page.locator('.banner.ok').filter({ hasText: 'Catálogo salvo' }).waitFor()
    ok('salvar após criar')

    await page.getByLabel('Buscar por código, tipo ou cor').fill('QA-VIDRO-01')
    const rows = page.locator('.catalog-table tbody tr')
    await page.waitForTimeout(100)
    check('buscar código', (await rows.count()) === 1, `${await rows.count()} linha(s)`)

    await page.getByRole('button', { name: 'Desativar QA-VIDRO-01' }).click()
    await page.waitForTimeout(100)
    check(
      'desativar oculta em Só ativos',
      (await page.getByRole('cell', { name: 'QA-VIDRO-01', exact: true }).count()) === 0,
    )

    await pick(page, 'Filtrar por situação', 'Todos')
    await page.getByRole('cell', { name: 'QA-VIDRO-01', exact: true }).waitFor()
    check(
      'inativo aparece em Todos com estilo',
      (await page.locator('tr.catalog-row--inactive', {
        has: page.getByRole('cell', { name: 'QA-VIDRO-01', exact: true }),
      }).count()) === 1,
    )

    await page.getByRole('button', { name: 'Reativar QA-VIDRO-01' }).click()
    check(
      'reativar volta ao salvo',
      (await saveBtn.innerText()).trim() === 'Salvo',
      `botão="${(await saveBtn.innerText()).trim()}"`,
    )

    for (const [table, heading] of [
      ['Kit Box', 'Kit Box'],
      ['Acessórios', 'Acessórios'],
      ['Alumínios', 'Alumínios'],
      ['Mão de obra / margem', 'Mão de obra'],
      ['Vidros', 'Vidros'],
    ]) {
      await pick(page, 'Tabela do catálogo', table)
      await page.getByRole('heading', { name: heading, level: 2, exact: true }).waitFor()
      ok(`tabela ${table}`)
    }

    await money.fill('1,00')
    await money.blur()
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Resetar mudanças' }).click()
    check('resetar mudanças volta ao salvo', (await saveBtn.innerText()).trim() === 'Salvo')

    check('sem erros de página', pageErrors.length === 0, pageErrors.join(' | '))
    await page.screenshot({ path: join(OUT, 'catalog-final.png'), fullPage: true })
  } catch (err) {
    const shot = join(OUT, 'catalog-failure.png')
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {})
    fail('exception', `${err.message} (shot ${shot})`)
  } finally {
    await browser.close()
  }

  const passed = results.filter((r) => r.pass).length
  const failed = results.length - passed
  console.log(`\n${passed} passed, ${failed} failed`)
  writeFileSync(join(OUT, 'catalog-results.json'), JSON.stringify(results, null, 2))
  process.exit(failed ? 1 : 0)
}

main()

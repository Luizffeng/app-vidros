/**
 * Browser QA: Catálogo CRUD + export/import JSON
 * Run: node scripts/validate-catalog-browser.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
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

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ acceptDownloads: true })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)

  try {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Catálogo' }).click()
    await page.getByRole('heading', { name: 'Catálogo de preços' }).waitFor()
    ok('abrir catálogo')

    // Edit price of first money input
    const money = page.locator('.catalog-table .money-input').first()
    await money.click()
    await money.fill('199,99')
    await money.blur()
    const saveBtn = page.getByRole('button', { name: 'Salvar catálogo' })
    await saveBtn.waitFor({ state: 'visible' })
    if (await saveBtn.isDisabled()) {
      fail('editar preço suja draft', 'Salvar ainda desabilitado')
    } else {
      ok('editar preço suja draft')
    }
    await saveBtn.click()
    await page.locator('.banner.ok').filter({ hasText: 'Catálogo salvo' }).waitFor()
    ok('salvar catálogo após edição')

    // Create vidro via modal
    await page.getByRole('button', { name: 'Adicionar vidro' }).click()
    await page.getByRole('heading', { name: 'Novo vidro' }).waitFor()
    const modal = page.locator('.modal')
    await modal.getByLabel('Código').fill('QA-VIDRO-01')
    await modal.getByLabel('Tipo').fill('Temperado')
    await modal.getByLabel('Cor').fill('QATest')
    await modal.getByLabel('Espessura (mm)').fill('08')
    await modal.getByLabel('R$/m²').fill('123,45')
    await modal.getByRole('button', { name: 'Adicionar vidro' }).click()
    await page.getByRole('cell', { name: 'QA-VIDRO-01' }).waitFor()
    ok('criar vidro')

    await page.getByRole('button', { name: 'Salvar catálogo' }).click()
    await page.locator('.banner.ok').filter({ hasText: 'Catálogo salvo' }).waitFor()
    ok('salvar após criar')

    // Search
    await page.locator('.catalog-search').fill('QA-VIDRO-01')
    await page.getByRole('cell', { name: 'QA-VIDRO-01' }).waitFor()
    const rows = page.locator('.catalog-table tbody tr')
    if ((await rows.count()) !== 1) {
      fail('buscar código', `esperado 1 linha, veio ${await rows.count()}`)
    } else {
      ok('buscar código', '1 resultado')
    }

    // Deactivate
    await page.getByRole('button', { name: 'Desativar' }).click()
    // With "Só ativos", row should disappear
    await page.getByRole('button', { name: 'Só ativos' }).click()
    await page.waitForTimeout(200)
    if ((await page.getByRole('cell', { name: 'QA-VIDRO-01' }).count()) > 0) {
      fail('desativar oculta em Só ativos', 'ainda visível')
    } else {
      ok('desativar oculta em Só ativos')
    }

    await page.getByRole('button', { name: 'Incluir inativos' }).click()
    await page.getByRole('cell', { name: 'QA-VIDRO-01' }).waitFor()
    const inactiveRow = page.locator('tr.catalog-row--inactive', {
      has: page.getByRole('cell', { name: 'QA-VIDRO-01' }),
    })
    if ((await inactiveRow.count()) !== 1) {
      fail('inativo com estilo', 'classe catalog-row--inactive ausente')
    } else {
      ok('inativo aparece com estilo')
    }

    await page.getByRole('button', { name: 'Reativar' }).click()
    // Desativar sem salvar + reativar volta ao snapshot salvo → botão vira "Salvo"
    const footerSave = page.locator('footer.catalog-actions .btn.primary')
    await footerSave.waitFor()
    const saveLabel = (await footerSave.innerText()).trim()
    if (saveLabel === 'Salvar catálogo' && (await footerSave.isEnabled())) {
      await footerSave.click()
      await page.locator('.banner.ok').filter({ hasText: 'Catálogo salvo' }).waitFor()
      ok('reativar + salvar')
    } else {
      ok('reativar restaura estado salvo', `botão="${saveLabel}"`)
    }

    // Export JSON
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Exportar JSON' }).click(),
    ])
    const exportPath = join(OUT, await download.suggestedFilename())
    await download.saveAs(exportPath)
    const exported = JSON.parse(readFileSync(exportPath, 'utf8'))
    if (!exported.vidros?.some((v) => v.codigo === 'QA-VIDRO-01')) {
      fail('export JSON', 'QA-VIDRO-01 ausente no arquivo')
    } else {
      ok('export JSON', exportPath)
    }

    // Mutate export and import
    const mutated = structuredClone(exported)
    const qa = mutated.vidros.find((v) => v.codigo === 'QA-VIDRO-01')
    qa.valorM2 = 777.77
    qa.cor = 'QAImport'
    const importPath = join(OUT, 'catalog-import.json')
    writeFileSync(importPath, JSON.stringify(mutated, null, 2))

    await page.getByRole('button', { name: 'Importar JSON' }).click()
    await page.setInputFiles('input[type="file"][accept*="json"]', importPath)
    await page.locator('.banner.ok').filter({ hasText: 'Catálogo importado' }).waitFor()
    ok('import JSON mensagem')

    await page.locator('.catalog-search').fill('QA-VIDRO-01')
    await page.getByRole('cell', { name: 'QAImport' }).waitFor()
    ok('import reflete na tabela', 'cor QAImport')

    await page.getByRole('button', { name: 'Salvar catálogo' }).click()
    await page.locator('.banner.ok').filter({ hasText: 'Catálogo salvo' }).waitFor()
    ok('salvar após import')

    // Tabs smoke
    for (const tab of ['Kit Box', 'Acessórios', 'Alumínios', 'Mão de obra / margem']) {
      await page.getByRole('tab', { name: tab }).click()
      await page.waitForTimeout(150)
      ok(`aba ${tab}`)
    }

    await page.getByRole('tab', { name: 'Vidros' }).click()
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Restaurar seed' }).click()
    const restoreSave = page.locator('footer.catalog-actions .btn.primary')
    if (await restoreSave.isEnabled()) {
      await restoreSave.click()
      await page.locator('.banner.ok').filter({ hasText: 'Catálogo salvo' }).waitFor()
    }
    ok('cleanup: restaurar seed')

    await page.screenshot({ path: join(OUT, 'catalog-final.png'), fullPage: true })
  } catch (err) {
    const shot = join(OUT, 'failure.png')
    try {
      await page.screenshot({ path: shot, fullPage: true })
    } catch {
      /* ignore */
    }
    fail('exception', `${err.message}${existsSync(shot) ? ` (shot ${shot})` : ''}`)
  } finally {
    await browser.close()
  }

  const passed = results.filter((r) => r.pass).length
  const failed = results.filter((r) => !r.pass).length
  console.log(`\n${passed} passed, ${failed} failed`)
  writeFileSync(join(OUT, 'results.json'), JSON.stringify(results, null, 2))
  process.exit(failed ? 1 : 0)
}

main()

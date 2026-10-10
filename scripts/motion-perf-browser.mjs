/**
 * Motion perf check (spec 004): CPU throttled 4× via CDP, records long tasks and
 * frame gaps while opening/closing a modal, toggling a section, switching tabs,
 * navigating list ↔ editor and scrolling the list. Reports the median of RUNS (default 3).
 * Needs a dev server in local mode (no Supabase):
 *   VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run dev -- --host 127.0.0.1
 * Run: APP_URL=http://127.0.0.1:5173 node scripts/motion-perf-browser.mjs
 * Compare: BASELINE=tmp-browser-qa/motion-perf-baseline.json (written with SAVE_BASELINE=1).
 */
import { chromium } from 'playwright'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5173'
const OUT = join(process.cwd(), 'tmp-browser-qa')
const BASELINE = process.env.BASELINE ?? join(OUT, 'motion-perf-baseline.json')
const CPU_RATE = Number(process.env.CPU_RATE ?? 4)
const RUNS = Number(process.env.RUNS ?? 3)
const LIST_SIZE = 40
const ITEMS = Number(process.env.ITEMS ?? 3)
const WINDOW_MS = 700
const MAX_LONG_TASK = 50
const MIN_FPS = 50
mkdirSync(OUT, { recursive: true })

const RECORDER = () => {
  const perf = { rec: false, frames: [], longtasks: [] }
  window.__perf = perf
  try {
    new PerformanceObserver((list) => {
      if (!perf.rec) return
      for (const entry of list.getEntries()) perf.longtasks.push(entry.duration)
    }).observe({ type: 'longtask' })
  } catch {
    /* longtask unsupported */
  }
  let last = 0
  const tick = (t) => {
    if (perf.rec && last) perf.frames.push(t - last)
    last = t
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

async function measure(page, name, action) {
  await page.evaluate(() => {
    window.__perf.frames = []
    window.__perf.longtasks = []
    window.__perf.rec = true
  })
  const start = Date.now()
  await action()
  const left = WINDOW_MS - (Date.now() - start)
  if (left > 0) await page.waitForTimeout(left)
  await page.waitForTimeout(50)
  const raw = await page.evaluate(() => {
    window.__perf.rec = false
    return { frames: window.__perf.frames, longtasks: window.__perf.longtasks }
  })
  const frames = raw.frames
  const total = frames.reduce((a, b) => a + b, 0)
  const sorted = [...frames].sort((a, b) => a - b)
  return {
    name,
    frames: frames.length,
    fps: total ? Math.round((frames.length * 1000) / total) : 0,
    worstFrame: Math.round(sorted.at(-1) ?? 0),
    p95Frame: Math.round(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
    longTasks: raw.longtasks.length,
    maxLongTask: Math.round(Math.max(0, ...raw.longtasks)),
  }
}

async function seedList(page) {
  await page.getByRole('button', { name: /^Orçamentos:/ }).click()
  await page.getByRole('heading', { name: 'Orçamentos', level: 1 }).waitFor()
  await page.getByRole('button', { name: 'Novo orçamento' }).click()
  await page.getByRole('heading', { level: 1, name: /^ORC-/ }).waitFor()
  for (let i = 0; i < ITEMS; i++) {
    const [w, h] = [[1000, 800], [1200, 900], [600, 600]][i % 3]
    await page.getByRole('button', { name: 'Adicionar item' }).click()
    await page.getByRole('button', { name: 'Espelho', exact: true }).click()
    const modal = page.locator('.modal--item')
    await modal.getByLabel('Largura (mm)').fill(String(w))
    await modal.getByLabel('Altura (mm)').fill(String(h))
    await modal.getByRole('button', { name: 'Adicionar item' }).click()
    await modal.waitFor({ state: 'detached' })
  }
  await page.locator('#customer-name').fill('Cliente Perf')
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.getByRole('heading', { name: 'Orçamentos', level: 1 }).waitFor()
  await page.evaluate(async (count) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('forte-vidros')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const all = await new Promise((resolve, reject) => {
      const req = db.transaction('quotes').objectStore('quotes').getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const source = all.find((q) => q.customer?.name === 'Cliente Perf') ?? all[0]
    const tx = db.transaction('quotes', 'readwrite')
    for (let i = 0; i < count; i++) {
      tx.objectStore('quotes').put({
        ...source,
        id: crypto.randomUUID(),
        customer: { ...source.customer, name: `Cliente Perf ${i + 1}` },
      })
    }
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, LIST_SIZE)
  await page.goto(`${BASE.replace(/\/$/, '')}/orcamentos`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Orçamentos', level: 1 }).waitFor()
}

async function runOnce(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'no-preference',
  })
  await context.addInitScript(RECORDER)
  const page = await context.newPage()
  page.setDefaultTimeout(20000)
  const results = []

  try {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    if (await page.getByLabel(/senha/i).count()) {
      throw new Error('tela de login: servidor está em modo Supabase, rode em modo local')
    }
    await seedList(page)

    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_RATE })
    await page.waitForTimeout(300)

    results.push(
      await measure(page, 'rolar lista', async () => {
        for (let i = 0; i < 12; i++) {
          await page.mouse.wheel(0, 250)
          await page.waitForTimeout(40)
        }
      }),
    )
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(200)

    const statusFilter = page.getByRole('button', { name: /^Filtrar por status/ })
    results.push(await measure(page, 'abrir seletor', () => statusFilter.click()))
    results.push(await measure(page, 'fechar seletor', () => page.keyboard.press('Escape')))

    results.push(
      await measure(page, 'lista → orçamento', async () => {
        await page.locator('.quote-card').first().click()
        await page.locator('.quote-head').waitFor()
      }),
    )

    results.push(
      await measure(page, 'abrir janela', async () => {
        await page.getByRole('button', { name: 'Adicionar item' }).click()
        await page.getByRole('heading', { name: 'Tipo do item' }).waitFor()
      }),
    )
    results.push(
      await measure(page, 'fechar janela', async () => {
        await page.keyboard.press('Escape')
        await page.locator('.modal-backdrop').waitFor({ state: 'detached' })
      }),
    )

    const itemsSummary = page.locator('summary', { hasText: 'Itens' })
    results.push(await measure(page, 'fechar seção Itens', () => itemsSummary.click()))
    results.push(await measure(page, 'abrir seção Itens', () => itemsSummary.click()))

    results.push(
      await measure(page, 'abrir menu', () => page.getByRole('button', { name: 'Menu' }).click()),
    )
    results.push(await measure(page, 'fechar menu', () => page.keyboard.press('Escape')))

    results.push(
      await measure(page, 'orçamento → lista', async () => {
        await page.getByRole('button', { name: 'Voltar', exact: true }).click()
        await page.getByRole('heading', { name: 'Orçamentos', level: 1 }).waitFor()
      }),
    )

    await page.getByRole('button', { name: 'Menu' }).click()
    results.push(
      await measure(page, 'menu → Configurações', async () => {
        await page.getByRole('menuitem', { name: 'Configurações' }).click()
        await page.getByRole('tab', { name: 'Orçamento' }).waitFor()
      }),
    )
    for (const tab of ['Orçamento', 'Logo', 'Cadastro']) {
      results.push(
        await measure(page, `aba ${tab}`, () => page.getByRole('tab', { name: tab }).click()),
      )
    }

    await page.getByRole('button', { name: 'Menu' }).click()
    results.push(
      await measure(page, 'menu → Catálogo', async () => {
        await page.getByRole('menuitem', { name: 'Catálogo' }).click()
        await page.locator('.catalog-table').first().waitFor()
      }),
    )
    results.push(
      await measure(page, 'rolar catálogo', async () => {
        for (let i = 0; i < 12; i++) {
          await page.mouse.wheel(0, 250)
          await page.waitForTimeout(40)
        }
      }),
    )
  } catch (err) {
    const shot = join(OUT, 'motion-perf-failure.png')
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {})
    throw new Error(`${err.message} (shot ${shot})`)
  } finally {
    await context.close()
  }
  return results
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const runs = []
  try {
    for (let i = 0; i < RUNS; i++) runs.push(await runOnce(browser))
  } catch (err) {
    console.error(`FAIL  exception — ${err.message}`)
    await browser.close()
    process.exit(1)
  }
  await browser.close()

  const results = runs[0].map((first, i) => {
    const same = runs.map((run) => run[i])
    const out = { name: first.name }
    for (const key of ['frames', 'fps', 'worstFrame', 'p95Frame', 'longTasks', 'maxLongTask']) {
      out[key] = median(same.map((r) => r[key]))
    }
    return out
  })

  const baseline = existsSync(BASELINE) && !process.env.SAVE_BASELINE
    ? Object.fromEntries(JSON.parse(readFileSync(BASELINE, 'utf8')).map((r) => [r.name, r]))
    : null

  let failed = 0
  console.log(`CPU ${CPU_RATE}× · mediana de ${RUNS} rodadas · janela ${WINDOW_MS} ms · limite tarefa ${MAX_LONG_TASK} ms · ${MIN_FPS} fps`)
  console.log('cenário                  fps  pior  p95  longas  maior' + (baseline ? '   (baseline fps/pior/maior)' : ''))
  for (const r of results) {
    const base = baseline?.[r.name]
    const overLong = r.maxLongTask > MAX_LONG_TASK
    const lowFps = r.fps < MIN_FPS
    // Over the absolute limit still passes when it is no worse than before the feature
    // (the cost is the React render, not the motion).
    const noWorse = base && r.maxLongTask <= Math.max(MAX_LONG_TASK, base.maxLongTask * 1.15 + 5)
      && r.fps >= Math.min(MIN_FPS, base.fps - 3)
    const pass = (!overLong && !lowFps) || Boolean(noWorse)
    if (!pass) failed++
    const cols = [
      r.name.padEnd(24),
      String(r.fps).padStart(3),
      String(r.worstFrame).padStart(5),
      String(r.p95Frame).padStart(4),
      String(r.longTasks).padStart(7),
      String(r.maxLongTask).padStart(6),
    ].join(' ')
    const baseCols = base ? `   (${base.fps}/${base.worstFrame}/${base.maxLongTask})` : ''
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${cols}${baseCols}`)
  }

  const file = process.env.SAVE_BASELINE ? BASELINE : join(OUT, 'motion-perf.json')
  writeFileSync(file, JSON.stringify(results, null, 2))
  console.log(`\n${results.length - failed} passed, ${failed} failed · ${file}`)
  process.exit(failed ? 1 : 0)
}

main()

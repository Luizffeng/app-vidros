import { isCatalogItemActive } from './catalogActive'
import { confirmed, sameRef } from './catalogEdit'
import { settingsPending } from './home'
import type { Acessorio, Aluminio, AppSettings, Catalog, CatalogRef, CatalogTable, KitBox, Quote, Vidro } from './types'

export type OnboardingTaskId = 'loja' | 'vidros' | 'ferragens' | 'maoDeObra' | 'primeiroOrcamento'

/** Aba do catálogo onde a tarefa se resolve. */
export type ExampleTab = CatalogTable | 'config'

export interface OnboardingTask {
  id: OnboardingTaskId
  label: string
  done: boolean
  /** Só nas tarefas do catálogo */
  tab?: ExampleTab
}

export const HARDWARE_TABLES: readonly CatalogTable[] = ['kitBox', 'acessorios', 'aluminios']
const PRICE_TABLES: readonly CatalogTable[] = ['vidros', ...HARDWARE_TABLES]

type Row = Vidro | KitBox | Acessorio | Aluminio

/** Mesmo campo de `catalogPrice`, sem olhar se a linha está ativa. */
function rowPrice(table: CatalogTable, row: Row): number | null | undefined {
  if (table === 'vidros') return (row as Vidro).valorM2
  if (table === 'aluminios') return (row as Aluminio).valorBarra
  return (row as KitBox | Acessorio).valor
}

/** Linhas ativas, com preço, ainda no valor de exemplo. Linha sem preço não entra no cálculo e não conta. */
export function examplePending(catalog: Catalog, table: CatalogTable): number {
  return (catalog[table] as Row[]).filter(
    (row) => row.exemplo && isCatalogItemActive(row) && (rowPrice(table, row) ?? 0) > 0,
  ).length
}

export function onboardingTasks(catalog: Catalog, settings: AppSettings, quotes: readonly Quote[]): OnboardingTask[] {
  const hardwareTab = HARDWARE_TABLES.find((t) => examplePending(catalog, t) > 0)
  return [
    { id: 'loja', label: 'Sua loja', done: settingsPending(settings).length === 0 },
    { id: 'vidros', label: 'Seus vidros', done: examplePending(catalog, 'vidros') === 0, tab: 'vidros' },
    { id: 'ferragens', label: 'Suas ferragens e perfis', done: !hardwareTab, tab: hardwareTab ?? 'kitBox' },
    { id: 'maoDeObra', label: 'Mão de obra e margem', done: !catalog.config.exemplo, tab: 'config' },
    { id: 'primeiroOrcamento', label: 'Seu primeiro orçamento', done: quotes.some((q) => q.status === 'emitted') },
  ]
}

/** Card no Início: até dispensar ou concluir tudo. */
export function onboardingVisible(tasks: readonly OnboardingTask[], settings: AppSettings): boolean {
  return !settings.onboardingDismissedAt && tasks.some((t) => !t.done)
}

export interface ExampleUse {
  refs: CatalogRef[]
  /** Mão de obra ou margem ainda de exemplo, com algum item usando uma das duas */
  config: boolean
}

/** Preços de exemplo que o orçamento usa: linhas de material sem preço só deste orçamento, e mão de obra/margem. */
export function exampleUseInQuote(quote: Quote, catalog: Catalog): ExampleUse {
  const refs: CatalogRef[] = []
  let laborOrMargin = false
  for (const item of quote.items) {
    if (item.input.kind === 'custom') continue
    if (item.result.breakdown.labor > 0 || item.input.markup > 0) laborOrMargin = true
    for (const line of item.result.bom) {
      const ref = line.source
      if (!ref || refs.some((r) => sameRef(r, ref))) continue
      if (quote.priceOverrides?.some((o) => sameRef(o.ref, ref))) continue
      const row = (catalog[ref.table] as Row[]).find((r) => r.id === ref.id)
      if (row?.exemplo) refs.push(ref)
    }
  }
  return { refs, config: Boolean(catalog.config.exemplo) && laborOrMargin }
}

export const usesExample = (use: ExampleUse) => use.refs.length > 0 || use.config

/** Aba para revisar primeiro: a do primeiro material de exemplo, senão mão de obra. */
export const firstExampleTab = (use: ExampleUse): ExampleTab => use.refs[0]?.table ?? 'config'

const EXAMPLE_NAMES: Record<ExampleTab, string> = {
  vidros: 'vidros',
  kitBox: 'kits de box',
  acessorios: 'acessórios',
  aluminios: 'perfis',
  config: 'mão de obra',
}

/** "vidros, perfis e mão de obra" */
export function exampleNames(use: ExampleUse): string {
  const tabs: ExampleTab[] = PRICE_TABLES.filter((t) => use.refs.some((r) => r.table === t))
  if (use.config) tabs.push('config')
  const names = tabs.map((t) => EXAMPLE_NAMES[t])
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} e ${names.at(-1)}` : (names[0] ?? '')
}

/** "Confirmar preços": tira o exemplo de uma tabela inteira, ou da mão de obra e margem. */
export function confirmExampleTable(catalog: Catalog, tab: ExampleTab): Catalog {
  if (tab === 'config') return { ...catalog, config: confirmed(catalog.config) }
  return { ...catalog, [tab]: (catalog[tab] as Row[]).map((row) => confirmed(row)) }
}

/** Ao salvar o catálogo: linha com preço mudado, e mão de obra/margem mudadas, deixam de ser exemplo. */
export function clearEditedExamples(before: Catalog, after: Catalog): Catalog {
  const next: Catalog = { ...after }
  for (const table of PRICE_TABLES) {
    const old = before[table] as Row[]
    ;(next as unknown as Record<CatalogTable, Row[]>)[table] = (after[table] as Row[]).map((row) => {
      if (!row.exemplo) return row
      const prev = old.find((r) => r.id === row.id)
      return prev && rowPrice(table, prev) === rowPrice(table, row) ? row : confirmed(row)
    })
  }
  const pick = (c: Catalog) => JSON.stringify([c.config.labor, c.config.defaultMarkup])
  if (after.config.exemplo && pick(before) !== pick(after)) next.config = confirmed(after.config)
  return next
}

import { catalogPrice, sameRef, withPriceOverrides } from './catalogEdit'
import { LABOR_KEY } from './pricing'
import type { BomLine, Catalog, LaborKey, Quote, QuoteItem } from './types'

export type CostGroupCategory = BomLine['category']

export interface CostLine extends BomLine {
  editable: boolean
  overridden: boolean
  blockedReason?: 'old-item' | 'inactive' | 'readonly'
  /** Unit price without the color surcharge */
  basePrice: number
  /** Current editable field (aluminios: price per barra), with this quote's own price applied */
  editPrice?: number
  /** Aluminios only: barra length in meters, for the R$/m hint */
  barLength?: number
  /** Labor line only: which `config.labor` rate it uses */
  laborKey?: LaborKey
  /** Draft only, set when today's catalog differs: unit price now (with color surcharge) */
  catalogNow?: number
}

export interface CostGroup {
  category: CostGroupCategory
  label: string
  total: number
  lines: CostLine[]
}

const GROUPS: { category: CostGroupCategory; label: string }[] = [
  { category: 'vidro', label: 'Vidro' },
  { category: 'aluminio', label: 'Alumínio' },
  { category: 'ferragem', label: 'Ferragem' },
  { category: 'acessorio', label: 'Acessório' },
  { category: 'mao_de_obra', label: 'Mão de obra' },
  { category: 'outro', label: 'Outros' },
]

export function composeCost(
  item: QuoteItem,
  quote: Quote,
  catalog: Catalog,
  opts: { isAdmin: boolean },
): { groups: CostGroup[]; totalCost: number } {
  if (item.input.kind === 'custom') return { groups: [], totalCost: item.result.breakdown.totalCost }
  const input = item.input
  const effective = withPriceOverrides(catalog, quote.priceOverrides)
  const canEdit = opts.isAdmin && quote.status === 'draft'

  /** Unit price the line would get today, comparable to `line.unitPrice`. */
  const priceNow = (line: BomLine): number | undefined => {
    if (line.category === 'mao_de_obra') return input.laborRate ?? catalog.config.labor[LABOR_KEY[input.kind]]
    if (!line.source || !line.unit) return undefined
    const field = catalogPrice(effective, line.source)
    if (field == null) return undefined
    const id = line.source.id
    const unit = line.source.table === 'aluminios' ? effective.aluminios.find((a) => a.id === id)?.valorMetro : field
    return unit == null ? undefined : unit * (1 + (line.surcharge ?? 0))
  }

  const lines = item.result.bom.map((line): CostLine => withCatalogNow(line, toCostLine(line)))

  function withCatalogNow(line: BomLine, cost: CostLine): CostLine {
    if (quote.status !== 'draft') return cost
    const now = priceNow(line)
    return now != null && Math.abs(now - line.unitPrice) >= 0.005 ? { ...cost, catalogNow: now } : cost
  }

  function toCostLine(line: BomLine): CostLine {
    const overridden = Boolean(
      line.source && quote.priceOverrides?.some((o) => sameRef(o.ref, line.source!)),
    )
    const basePrice = line.surcharge ? line.unitPrice / (1 + line.surcharge) : line.unitPrice
    const base = { ...line, overridden, basePrice }
    if (line.category === 'mao_de_obra') {
      const laborKey = LABOR_KEY[input.kind]
      return {
        ...base,
        overridden: input.laborRate != null,
        editable: canEdit,
        blockedReason: canEdit ? undefined : 'readonly',
        editPrice: input.laborRate ?? catalog.config.labor[laborKey],
        laborKey,
      }
    }
    if (!canEdit) return { ...base, editable: false, blockedReason: 'readonly' }
    if (!line.unit || !line.source) return { ...base, editable: false, blockedReason: 'old-item' }
    if (catalogPrice(catalog, line.source) == null) {
      return { ...base, editable: false, blockedReason: 'inactive' }
    }
    const barLength =
      line.source.table === 'aluminios'
        ? catalog.aluminios.find((a) => a.id === line.source!.id)?.metragemBarra
        : undefined
    return { ...base, editable: true, editPrice: catalogPrice(effective, line.source) ?? undefined, barLength }
  }

  const groups = GROUPS.flatMap(({ category, label }) => {
    const groupLines = lines.filter((l) => l.category === category)
    if (!groupLines.length) return []
    return [{ category, label, lines: groupLines, total: groupLines.reduce((s, l) => s + l.total, 0) }]
  })
  return { groups, totalCost: item.result.breakdown.totalCost }
}

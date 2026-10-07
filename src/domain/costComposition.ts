import { catalogPrice, sameRef, withPriceOverrides } from './catalogEdit'
import type { BomLine, Catalog, Quote, QuoteItem } from './types'

export type CostGroupCategory = BomLine['category']

export interface CostLine extends BomLine {
  editable: boolean
  overridden: boolean
  blockedReason?: 'old-item' | 'inactive' | 'labor' | 'readonly'
  /** Unit price without the color surcharge */
  basePrice: number
  /** Current editable field (aluminios: price per barra), with this quote's own price applied */
  editPrice?: number
  /** Aluminios only: barra length in meters, for the R$/m hint */
  barLength?: number
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
  const effective = withPriceOverrides(catalog, quote.priceOverrides)
  const canEdit = opts.isAdmin && quote.status === 'draft'

  const lines = item.result.bom.map((line): CostLine => {
    const overridden = Boolean(
      line.source && quote.priceOverrides?.some((o) => sameRef(o.ref, line.source!)),
    )
    const basePrice = line.surcharge ? line.unitPrice / (1 + line.surcharge) : line.unitPrice
    const base = { ...line, overridden, basePrice }
    if (line.category === 'mao_de_obra') return { ...base, editable: false, blockedReason: 'labor' }
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
  })

  const groups = GROUPS.flatMap(({ category, label }) => {
    const groupLines = lines.filter((l) => l.category === category)
    if (!groupLines.length) return []
    return [{ category, label, lines: groupLines, total: groupLines.reduce((s, l) => s + l.total, 0) }]
  })
  return { groups, totalCost: item.result.breakdown.totalCost }
}

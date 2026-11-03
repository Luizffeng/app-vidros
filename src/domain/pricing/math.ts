import { isCatalogItemActive } from '../catalogActive'
import type { BomLine, Catalog, CatalogTable, MarginMode, PricingConfig } from '../types'

/** Peça do catálogo sem preço (ou ausente) no meio do cálculo. */
export class MissingPriceError extends Error {
  readonly table: CatalogTable
  readonly id: number | null
  readonly code: string
  readonly label: string
  readonly headline: string
  readonly unit: string
  /** Linha ativa existe; só falta o número. */
  readonly canPrice: boolean
  /** A linha achada está desativada. */
  readonly inactive: boolean

  constructor(fields: {
    message: string
    table: CatalogTable
    id: number | null
    code: string
    label: string
    headline: string
    unit: string
    canPrice: boolean
    inactive: boolean
  }) {
    super(fields.message)
    this.name = 'MissingPriceError'
    this.table = fields.table
    this.id = fields.id
    this.code = fields.code
    this.label = fields.label
    this.headline = fields.headline
    this.unit = fields.unit
    this.canPrice = fields.canPrice
    this.inactive = fields.inactive
  }
}

export function laborLine(quantity: number, unit: 'm2' | 'un', rate: number, total: number): BomLine {
  return { code: '', description: 'Mão de obra', quantity, unitPrice: rate, total, category: 'mao_de_obra', unit }
}

/** Breakdown applies the profile color surcharge to group totals; lines carry it too so they sum to the cost. */
export function withSurcharge(line: BomLine, surcharge: number): BomLine {
  if (!surcharge) return line
  return {
    ...line,
    unitPrice: line.unitPrice * (1 + surcharge),
    total: line.total * (1 + surcharge),
    surcharge,
  }
}

/** Excel-compatible CEILING(number, significance) */
export function ceiling(value: number, significance: number): number {
  if (significance === 0) return value
  return Math.ceil(value / significance - 1e-12) * significance
}

export function roundUp(value: number, digits: number): number {
  const f = 10 ** digits
  return Math.ceil(value * f - 1e-12) / f
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function aluminumSurcharge(config: PricingConfig, color: string): number {
  const found = config.aluminumColors.find((c) => c.color === color)
  if (!found) throw new Error(`Cor de alumínio desconhecida: ${color}`)
  return found.surcharge
}

export function findVidro(
  catalog: Catalog,
  tipo: string,
  cor: string,
  espessuraMm?: string | null,
) {
  const same = (v: Catalog['vidros'][number]) =>
    v.tipo === tipo && v.cor === cor && (espessuraMm == null || v.espessuraMm === espessuraMm)
  const active = catalog.vidros.find((v) => isCatalogItemActive(v) && same(v))
  if (active && active.valorM2 != null) return active
  const row = active ?? catalog.vidros.find(same)
  const label = [tipo, cor, espessuraMm ? `${espessuraMm} mm` : ''].filter(Boolean).join(' - ')
  throw new MissingPriceError({
    message: `Vidro sem preço: ${tipo} / ${cor}${espessuraMm ? ` / ${espessuraMm}mm` : ''}`,
    table: 'vidros',
    id: row?.id ?? null,
    code: row?.codigo || tipo,
    label,
    headline: 'Vidro sem preço no catálogo!',
    unit: 'R$/m²',
    canPrice: Boolean(active && active.valorM2 == null),
    inactive: Boolean(row && !isCatalogItemActive(row)),
  })
}

export function findAcessorio(catalog: Catalog, codigo: string) {
  const active = catalog.acessorios.find((a) => isCatalogItemActive(a) && a.codigo === codigo)
  if (active && active.valor != null) return active
  const row = active ?? catalog.acessorios.find((a) => a.codigo === codigo)
  const missingPrice = Boolean(active && active.valor == null)
  throw new MissingPriceError({
    message: missingPrice ? `Acessório sem preço: ${codigo}` : `Acessório não encontrado: ${codigo}`,
    table: 'acessorios',
    id: row?.id ?? null,
    code: row?.codigo || codigo,
    label: row?.descricao || codigo,
    headline: missingPrice
      ? 'Acessório sem preço no catálogo!'
      : 'Acessório não encontrado no catálogo!',
    unit: 'Valor (R$)',
    canPrice: missingPrice,
    inactive: Boolean(row && !isCatalogItemActive(row)),
  })
}

export function findAluminio(catalog: Catalog, codigo: string) {
  const active = catalog.aluminios.find((a) => isCatalogItemActive(a) && a.codigo === codigo)
  if (active && active.valorBarra != null) return active
  const row = active ?? catalog.aluminios.find((a) => a.codigo === codigo)
  const missingPrice = Boolean(active && active.valorBarra == null)
  throw new MissingPriceError({
    message: missingPrice ? `Alumínio sem preço: ${codigo}` : `Alumínio não encontrado: ${codigo}`,
    table: 'aluminios',
    id: row?.id ?? null,
    code: row?.codigo || codigo,
    label: row?.descricao || codigo,
    headline: missingPrice
      ? 'Alumínio sem preço no catálogo!'
      : 'Alumínio não encontrado no catálogo!',
    unit: 'R$/barra',
    canPrice: missingPrice,
    inactive: Boolean(row && !isCatalogItemActive(row)),
  })
}

export function nearestKitSize(sizes: number[], spanCm: number): number {
  const sorted = [...sizes].sort((a, b) => a - b)
  const found = sorted.find((s) => s >= spanCm)
  if (found == null) return sorted[sorted.length - 1]
  return found
}

export function findKitBox(catalog: Catalog, cor: string, tamanhoCm: number) {
  const match = catalog.kitBox.find(
    (k) => isCatalogItemActive(k) && k.cor === cor && k.tamanhoCm === tamanhoCm,
  )
  if (match && match.valor != null) return match
  const row =
    match ?? catalog.kitBox.find((k) => k.cor === cor && k.tamanhoCm === tamanhoCm)
  throw new MissingPriceError({
    message: `Kit Box sem preço: ${cor} / ${tamanhoCm}cm`,
    table: 'kitBox',
    id: row?.id ?? null,
    code: row?.codigo || cor,
    label: `${cor} - ${tamanhoCm} cm`,
    headline: 'Kit sem preço no catálogo!',
    unit: 'Valor (R$)',
    canPrice: Boolean(match && match.valor == null),
    inactive: Boolean(row && !isCatalogItemActive(row)),
  })
}

export function sumItemExtras(extras: { amount: number }[] | number | undefined): number {
  if (typeof extras === 'number') return Number.isFinite(extras) ? extras : 0
  if (!Array.isArray(extras)) return 0
  return extras.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
}

export function buildBreakdown(parts: {
  labor: number
  glass: number
  aluminum: number
  hardware: number
  accessories: number
  extras: number
  markup: number
}, mode: MarginMode = 'empresa') {
  const withoutLabor =
    parts.glass + parts.aluminum + parts.hardware + parts.accessories + parts.extras
  const totalCost = withoutLabor + parts.labor
  const marginBase = mode === 'empresa' ? totalCost : mode === 'vendedor' ? withoutLabor : 0
  const marginAmount = marginBase * parts.markup
  const finalPrice = totalCost + marginAmount
  const marginPct = finalPrice === 0 ? 0 : marginAmount / finalPrice
  return {
    labor: parts.labor,
    glass: parts.glass,
    aluminum: parts.aluminum,
    hardware: parts.hardware,
    accessories: parts.accessories,
    extras: parts.extras,
    totalCost,
    finalPrice,
    marginPct,
    marginAmount,
    markup: parts.markup,
    marginMode: mode,
  }
}

/**
 * Customer-facing sell price of one item extra.
 * Empresa/vendedor: cost × (1 + markup). Autônomo: cost as-is (no margin).
 */
export function customerExtraSellPrice(
  costAmount: number,
  markup: number,
  mode: MarginMode = 'empresa',
): number {
  if (!(costAmount > 0) || !Number.isFinite(costAmount)) return 0
  if (mode === 'autonomo') return roundMoney(costAmount)
  const m = Number.isFinite(markup) ? markup : 0
  return roundMoney(costAmount * (1 + m))
}

/** Adjust span in meters like calc_BOX F15 */
export function adjustBoxSpanM(spanM: number): number {
  const mod = spanM % 0.05
  // floating remainder near 0
  const m = Math.abs(mod) < 1e-9 ? 0 : mod
  if (m <= 0.02) return spanM - m
  return spanM + (0.05 - m)
}

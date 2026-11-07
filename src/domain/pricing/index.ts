import type { Catalog, CatalogTable, CustomInput, ItemInput, LaborKey, MarginMode, PricingResult, ProductKind } from '../types'
import { priceBox } from './box'
import { priceCorrer } from './correr'
import { priceMaxiar } from './maxiar'
import { pricePivotante } from './pivotante'
import { priceEspelho, priceFixo } from './fixoEspelho'
import { buildBreakdown, MissingPriceError } from './math'

export function priceCustom(input: CustomInput): PricingResult {
  const amount = input.amount || 0
  const breakdown = buildBreakdown({
    labor: 0,
    glass: 0,
    aluminum: 0,
    hardware: 0,
    accessories: 0,
    extras: amount,
    markup: 0,
  })
  // For custom, final price is the amount itself
  breakdown.finalPrice = amount
  breakdown.totalCost = amount
  breakdown.marginAmount = 0
  breakdown.marginPct = 0

  return {
    kind: 'custom',
    label: input.description || 'Item avulso',
    bom: [
      {
        code: 'CUSTOM',
        description: input.description || 'Item avulso',
        quantity: 1,
        unitPrice: amount,
        total: amount,
        category: 'outro',
      },
    ],
    breakdown,
  }
}

function priceByKind(catalog: Catalog, input: ItemInput): PricingResult {
  switch (input.kind) {
    case 'box':
      return priceBox(catalog, input)
    case 'correr':
      return priceCorrer(catalog, input)
    case 'pivotante':
      return pricePivotante(catalog, input)
    case 'maxiar':
      return priceMaxiar(catalog, input)
    case 'fixo':
      return priceFixo(catalog, input)
    case 'espelho':
      return priceEspelho(catalog, input)
    case 'custom':
      return priceCustom(input)
    default: {
      const _exhaustive: never = input
      return _exhaustive
    }
  }
}

/** Which `config.labor` rate each kind uses. */
export const LABOR_KEY: Record<Exclude<ProductKind, 'custom'>, LaborKey> = {
  box: 'boxPerM2',
  correr: 'temperedPerM2',
  pivotante: 'temperedPerM2',
  maxiar: 'maxiarAvulso',
  fixo: 'temperedPerM2',
  espelho: 'temperedPerM2',
}

function withLaborRate(catalog: Catalog, input: ItemInput): Catalog {
  if (input.kind === 'custom' || input.laborRate == null) return catalog
  const labor = { ...catalog.config.labor, [LABOR_KEY[input.kind]]: input.laborRate }
  return { ...catalog, config: { ...catalog.config, labor } }
}

/** Pricers compute costs; the margin mode and the item's own labor rate are applied here. */
export function priceItem(
  catalog: Catalog,
  input: ItemInput,
  mode: MarginMode = 'empresa',
): PricingResult {
  const result = priceByKind(withLaborRate(catalog, input), input)
  if (input.kind === 'custom' || mode === 'empresa') return result
  return { ...result, breakdown: buildBreakdown(result.breakdown, mode) }
}

export type CostGroup = 'labor' | 'glass' | 'aluminum' | 'hardware' | 'accessories'

const GROUP_BY_CATEGORY = {
  vidro: 'glass',
  aluminio: 'aluminum',
  ferragem: 'hardware',
  acessorio: 'accessories',
  mao_de_obra: 'labor',
} as const satisfies Record<string, CostGroup>

export interface MissingPricePreview {
  result: PricingResult
  /** First gap, for the alert. Null when every line has a price. */
  missing: MissingPriceError | null
  /** Groups counted as zero because the catalog price is missing. */
  zeroed: ReadonlySet<CostGroup>
}

function catalogWithZero(catalog: Catalog, err: MissingPriceError): Catalog | null {
  const id = err.id
  if (id == null) return null
  if (err.table === 'vidros') {
    if (!catalog.vidros.some((row) => row.id === id)) return null
    return {
      ...catalog,
      vidros: catalog.vidros.map((row) => (row.id === id ? { ...row, valorM2: 0, ativo: true } : row)),
    }
  }
  if (err.table === 'acessorios') {
    if (!catalog.acessorios.some((row) => row.id === id)) return null
    return {
      ...catalog,
      acessorios: catalog.acessorios.map((row) => (row.id === id ? { ...row, valor: 0, ativo: true } : row)),
    }
  }
  if (err.table === 'aluminios') {
    if (!catalog.aluminios.some((row) => row.id === id)) return null
    return {
      ...catalog,
      aluminios: catalog.aluminios.map((row) =>
        row.id === id ? { ...row, valorBarra: 0, valorMetro: 0, ativo: true } : row,
      ),
    }
  }
  if (err.table === 'kitBox') {
    if (!catalog.kitBox.some((row) => row.id === id)) return null
    return {
      ...catalog,
      kitBox: catalog.kitBox.map((row) => (row.id === id ? { ...row, valor: 0, ativo: true } : row)),
    }
  }
  const _table: Exclude<CatalogTable, 'vidros' | 'acessorios' | 'aluminios' | 'kitBox'> = err.table
  return _table
}

/**
 * Same numbers as `priceItem` when the catalog is complete.
 * A missing price stays out of the saved quote: the preview counts that group as zero
 * so the cost list can stay on screen.
 */
export function priceItemPreview(
  catalog: Catalog,
  input: ItemInput,
  mode: MarginMode = 'empresa',
): MissingPricePreview {
  const zeroedIds: { table: CatalogTable; id: number }[] = []
  let missing: MissingPriceError | null = null
  let current = catalog
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const result = priceItem(current, input, mode)
      const zeroed = new Set<CostGroup>()
      for (const line of result.bom) {
        const source = line.source
        if (!source || line.category === 'outro' || !zeroedIds.some((row) => row.table === source.table && row.id === source.id)) continue
        const group = GROUP_BY_CATEGORY[line.category]
        if (group) zeroed.add(group)
      }
      return { result, missing, zeroed }
    } catch (e) {
      if (!(e instanceof MissingPriceError)) throw e
      const next = catalogWithZero(current, e)
      if (!next) throw e
      if (!missing) missing = e
      zeroedIds.push({ table: e.table, id: e.id! })
      current = next
    }
  }
  throw missing ?? new Error('Prévia de preço incompleto não fechou')
}

export * from './box'
export * from './correr'
export * from './pivotante'
export * from './maxiar'
export * from './fixoEspelho'
export * from './math'

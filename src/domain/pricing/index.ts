import type { Catalog, CustomInput, ItemInput, PricingResult } from '../types'
import { priceBox } from './box'
import { priceCorrer } from './correr'
import { priceMaxiar } from './maxiar'
import { pricePivotante } from './pivotante'
import { priceEspelho, priceFixo } from './fixoEspelho'
import { buildBreakdown } from './math'

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

export function priceItem(catalog: Catalog, input: ItemInput): PricingResult {
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

export * from './box'
export * from './correr'
export * from './pivotante'
export * from './maxiar'
export * from './fixoEspelho'
export * from './math'

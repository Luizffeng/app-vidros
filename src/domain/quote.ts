import { v4 as uuid } from 'uuid'
import type {
  AdditionalCost,
  Catalog,
  CustomerInfo,
  ItemInput,
  Quote,
  QuoteItem,
} from './types'

const DEFAULT_VALIDITY_DAYS = 15
import { priceItem } from './pricing'

export const FREIGHT_LABEL = 'Frete'

export function defaultFreightCost(): AdditionalCost {
  return { id: uuid(), label: FREIGHT_LABEL, amount: 0 }
}

export function isFreightCost(cost: AdditionalCost): boolean {
  return cost.label.trim().toLowerCase() === FREIGHT_LABEL.toLowerCase()
}

/** Garante linha Frete (R$ 0) no início — cálculo automático de km fica pro depois */
export function ensureFreightCost(costs: AdditionalCost[]): AdditionalCost[] {
  if (costs.some(isFreightCost)) return costs
  return [defaultFreightCost(), ...costs]
}

export function createEmptyDraft(
  number: string,
  pricingVersion: string,
): Quote {
  const now = new Date().toISOString()
  return {
    id: uuid(),
    number,
    revision: 1,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    customer: {},
    items: [],
    additionalCosts: [defaultFreightCost()],
    pricingVersion,
    itemsTotal: 0,
    additionalTotal: 0,
    grandTotal: 0,
  }
}

export function recomputeTotals(quote: Quote): Quote {
  const itemsTotal = quote.items.reduce(
    (sum, i) => sum + i.result.breakdown.finalPrice,
    0,
  )
  const additionalTotal = quote.additionalCosts.reduce(
    (sum, c) => sum + c.amount,
    0,
  )
  return {
    ...quote,
    itemsTotal,
    additionalTotal,
    grandTotal: itemsTotal + additionalTotal,
    updatedAt: new Date().toISOString(),
  }
}

export function addItem(
  quote: Quote,
  catalog: Catalog,
  input: ItemInput,
): Quote {
  const item: QuoteItem = {
    id: uuid(),
    input,
    result: priceItem(catalog, input),
  }
  return recomputeTotals({ ...quote, items: [...quote.items, item] })
}

export function updateItem(
  quote: Quote,
  catalog: Catalog,
  itemId: string,
  input: ItemInput,
): Quote {
  const items = quote.items.map((item) =>
    item.id === itemId
      ? { ...item, input, result: priceItem(catalog, input) }
      : item,
  )
  return recomputeTotals({ ...quote, items })
}

export function removeItem(quote: Quote, itemId: string): Quote {
  return recomputeTotals({
    ...quote,
    items: quote.items.filter((i) => i.id !== itemId),
  })
}

export function setAdditionalCosts(
  quote: Quote,
  costs: AdditionalCost[],
): Quote {
  return recomputeTotals({ ...quote, additionalCosts: costs })
}

export function setCustomer(quote: Quote, customer: CustomerInfo): Quote {
  return { ...quote, customer, updatedAt: new Date().toISOString() }
}

export function computeValidUntil(
  from: Date,
  validityDays: number = DEFAULT_VALIDITY_DAYS,
): string {
  const days =
    Number.isFinite(validityDays) && validityDays >= 1
      ? Math.round(validityDays)
      : DEFAULT_VALIDITY_DAYS
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

export function emitQuote(quote: Quote, validityDays: number = DEFAULT_VALIDITY_DAYS): Quote {
  if (quote.items.length === 0) {
    throw new Error('Adicione pelo menos um item para emitir o orçamento')
  }
  const emittedAt = new Date().toISOString()
  return {
    ...quote,
    status: 'emitted',
    emittedAt,
    validUntil: computeValidUntil(new Date(emittedAt), validityDays),
    updatedAt: emittedAt,
  }
}

/** Clone as a new editable revision */
export function createRevision(source: Quote, newId?: string): Quote {
  const now = new Date().toISOString()
  const clone = structuredClone(source)
  return recomputeTotals({
    ...clone,
    id: newId ?? uuid(),
    revision: source.revision + 1,
    parentId: source.parentId ?? source.id,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    emittedAt: undefined,
    validUntil: undefined,
    additionalCosts: ensureFreightCost(clone.additionalCosts),
  })
}

/** Rótulo do item para o cliente — sem medidas */
export function customerFacingItemLabel(input: ItemInput): string {
  switch (input.kind) {
    case 'box':
      return `Box frontal 2F (${input.glassColor}/${input.profileColor})`
    case 'correr':
      return `Correr ${input.subtype} (${input.glassColor}/${input.profileColor})`
    case 'pivotante':
      return `Pivotante (${input.glassColor}/${input.profileColor})`
    case 'maxiar':
      return `Maxim-ar (${input.glassColor}/${input.profileColor})`
    case 'fixo':
      return `Vidro fixo temperado (${input.glassColor})`
    case 'espelho':
      return `${input.finish} (${input.glassColor})`
    case 'custom':
      return input.description || 'Item avulso'
  }
}

export function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Código único: ORC-2026-0002-1 (número + revisão) */
export function formatQuoteCode(number: string, revision: number): string {
  return `${number}-${revision}`
}

/** Endereço legível p/ PDF e lista (structured + legado) */
export function formatCustomerAddress(customer: CustomerInfo): string {
  const line1 = [customer.street, customer.number].filter(Boolean).join(', ')
  const parts = [
    line1,
    customer.complement,
    customer.neighborhood,
    [customer.city, customer.state].filter(Boolean).join(' - '),
    customer.cep
      ? `CEP ${customer.cep.replace(/\D/g, '').replace(/^(\d{5})(\d{3})$/, '$1-$2')}`
      : '',
  ].filter(Boolean)
  if (parts.length > 0) return parts.join(' · ')
  return customer.address?.trim() || ''
}

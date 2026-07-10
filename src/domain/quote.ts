import { v4 as uuid } from 'uuid'
import type {
  AdditionalCost,
  Catalog,
  CustomerInfo,
  ItemInput,
  Quote,
  QuoteItem,
} from './types'
import { priceItem } from './pricing'

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
    additionalCosts: [],
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

export function emitQuote(quote: Quote): Quote {
  if (quote.items.length === 0) {
    throw new Error('Adicione pelo menos um item para emitir o orçamento')
  }
  return {
    ...quote,
    status: 'emitted',
    emittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/** Clone as a new editable revision */
export function createRevision(source: Quote, newId?: string): Quote {
  const now = new Date().toISOString()
  return {
    ...structuredClone(source),
    id: newId ?? uuid(),
    revision: source.revision + 1,
    parentId: source.parentId ?? source.id,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    emittedAt: undefined,
  }
}

export function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

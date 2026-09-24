import { v4 as uuid } from 'uuid'
import type {
  AdditionalCost,
  Catalog,
  CustomerInfo,
  ItemExtra,
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

function normalizeExtras(raw: unknown): ItemExtra[] {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw <= 0) return []
    return [{ id: uuid(), description: 'Adicional', amount: raw }]
  }
  if (!Array.isArray(raw)) return []
  return raw.flatMap((row) => {
    if (!row || typeof row !== 'object') return []
    const description = String((row as ItemExtra).description ?? '').trim()
    const amount = Number((row as ItemExtra).amount)
    if (!description || !Number.isFinite(amount) || amount < 0) return []
    const id = String((row as ItemExtra).id || uuid())
    return [{ id, description, amount }]
  })
}

function normalizeCosts(raw: unknown): AdditionalCost[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((row) => {
    if (!row || typeof row !== 'object') return []
    const label = String((row as AdditionalCost).label ?? '').trim()
    const amount = Number((row as AdditionalCost).amount)
    if (!label || !Number.isFinite(amount) || amount < 0) return []
    return [{ id: String((row as AdditionalCost).id || uuid()), label, amount }]
  })
}

export function normalizeQuote(quote: Quote): Quote {
  const discounts = normalizeCosts(quote.discounts)
  return withTotals({
    ...quote,
    discounts,
    items: quote.items.map((item) => {
      if (item.input.kind === 'custom') return item
      return {
        ...item,
        input: { ...item.input, extras: normalizeExtras(item.input.extras) },
      }
    }),
  })
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
    discounts: [],
    pricingVersion,
    itemsTotal: 0,
    additionalTotal: 0,
    discountTotal: 0,
    grandTotal: 0,
  }
}

function withTotals(quote: Quote): Quote {
  const itemsTotal = quote.items.reduce(
    (sum, i) => sum + i.result.breakdown.finalPrice,
    0,
  )
  const additionalTotal = quote.additionalCosts.reduce(
    (sum, c) => sum + c.amount,
    0,
  )
  const discountTotal = (quote.discounts ?? []).reduce(
    (sum, c) => sum + c.amount,
    0,
  )
  return {
    ...quote,
    discounts: quote.discounts ?? [],
    itemsTotal,
    additionalTotal,
    discountTotal,
    grandTotal: itemsTotal + additionalTotal - discountTotal,
  }
}

export function recomputeTotals(quote: Quote): Quote {
  return { ...withTotals(quote), updatedAt: new Date().toISOString() }
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

export function setDiscounts(quote: Quote, discounts: AdditionalCost[]): Quote {
  return recomputeTotals({ ...quote, discounts })
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
  if (!quote.customer.name?.trim()) {
    throw new Error('Informe o nome do cliente para emitir o orçamento')
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

export const DEFAULT_SHARE_CTA = 'Gostaria de realizar o pedido?'

function shareItemBlock(item: QuoteItem, index: number): string {
  const lines = [
    `*${index + 1}. ${customerFacingItemLabel(item.input)}*`,
    formatBrl(item.result.breakdown.finalPrice),
  ]
  if (item.input.kind !== 'custom') {
    for (const extra of item.input.extras) {
      const description = extra.description.trim()
      if (!description || extra.amount <= 0) continue
      lines.push(`• ${description} — ${formatBrl(extra.amount)}`)
    }
  }
  return lines.join('\n')
}

/** Texto curto pra WhatsApp e folha de compartilhar. Sem endereço. */
export function quoteShareText(
  quote: Quote,
  options?: { shopName?: string; cta?: string },
): string {
  const code = formatQuoteCode(quote.number, quote.revision)
  const shop = options?.shopName?.trim() || 'Vidraçaria'
  const client = quote.customer.name?.trim()
  const cta = options?.cta?.trim() ?? ''
  const items = quote.items.map((item, index) => shareItemBlock(item, index))
  const additionals = quote.additionalCosts
    .filter((cost) => cost.amount > 0 && cost.label.trim())
    .map((cost) => `*${cost.label.trim()}* — ${formatBrl(cost.amount)}`)
  const discountTotal = quote.discountTotal ?? 0
  return [
    `🪟 *${shop}*`,
    `*Orçamento ${code}*`,
    client || null,
    '',
    items.join('\n\n'),
    additionals.length ? '' : null,
    additionals.length ? additionals.join('\n') : null,
    discountTotal > 0 ? '' : null,
    discountTotal > 0 ? `*Desconto* — ${formatBrl(discountTotal)}` : null,
    '',
    `*Total ${formatBrl(quote.grandTotal)}*`,
    ...(cta ? ['', cta] : []),
  ]
    .filter((line) => line !== null)
    .join('\n')
}

export function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Código único: ORC-2026-0002-1 (número + revisão) */
export function formatQuoteCode(number: string, revision: number): string {
  return `${number}-${revision}`
}

/** Duas linhas: rua/número/bairro e CEP/cidade/estado. */
export function formatAddressLines(address: {
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  cep?: string
}): string {
  const street = [address.street, address.number, address.complement].filter(Boolean).join(', ')
  const place = [street, address.neighborhood].filter(Boolean).join(' — ')
  const cepDigits = address.cep?.replace(/\D/g, '') ?? ''
  const cep = cepDigits
    ? `CEP ${cepDigits.replace(/^(\d{5})(\d{3})$/, '$1-$2')}`
    : ''
  const city = [address.city, address.state].filter(Boolean).join(' - ')
  return [place, [cep, city].filter(Boolean).join(' · ')].filter(Boolean).join('\n')
}

/** Endereço do cliente no PDF. Legado sem campos fica numa linha. */
export function formatCustomerAddress(customer: CustomerInfo): string {
  const lines = formatAddressLines(customer)
  if (lines) return lines
  return customer.address?.trim() || ''
}

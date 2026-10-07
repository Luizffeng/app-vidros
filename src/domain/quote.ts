import { v4 as uuid } from 'uuid'
import type {
  AdditionalCost,
  Catalog,
  CustomerInfo,
  ItemExtra,
  ItemInput,
  MarginMode,
  PricingResult,
  Quote,
  QuoteItem,
} from './types'

const DEFAULT_VALIDITY_DAYS = 15
import { priceItem } from './pricing'
import { describeItem, itemNote } from './itemDescription'

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

const MARGIN_MODES: readonly MarginMode[] = ['empresa', 'vendedor', 'autonomo']

export function parseMarginMode(raw: unknown): MarginMode | undefined {
  return MARGIN_MODES.find((mode) => mode === raw)
}

export function normalizeQuote(quote: Quote): Quote {
  const discounts = normalizeCosts(quote.discounts)
  return withTotals({
    ...quote,
    marginMode: parseMarginMode(quote.marginMode),
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

/** Drafts created before freight became optional carry an automatic `Frete` line at R$ 0. */
export function dropEmptyFreight(costs: AdditionalCost[]): AdditionalCost[] {
  const next = costs.filter(
    (c) => !(c.amount === 0 && c.label.trim().toLowerCase() === 'frete'),
  )
  return next.length === costs.length ? costs : next
}

export function createEmptyDraft(
  number: string,
  pricingVersion: string,
  marginMode: MarginMode = 'empresa',
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
    discounts: [],
    pricingVersion,
    marginMode,
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
  mode: MarginMode = 'empresa',
): Quote {
  const item: QuoteItem = {
    id: uuid(),
    input,
    result: priceItem(catalog, input, mode),
  }
  return recomputeTotals({ ...quote, items: [...quote.items, item] })
}

export function updateItem(
  quote: Quote,
  catalog: Catalog,
  itemId: string,
  input: ItemInput,
  mode: MarginMode = 'empresa',
): Quote {
  const items = quote.items.map((item) =>
    item.id === itemId
      ? { ...item, input, result: priceItem(catalog, input, mode) }
      : item,
  )
  return recomputeTotals({ ...quote, items })
}

function tryPriceItem(catalog: Catalog, input: ItemInput, mode: MarginMode): PricingResult | null {
  try {
    return priceItem(catalog, input, mode)
  } catch {
    return null
  }
}

function samePrice(a: PricingResult, b: PricingResult): boolean {
  const cents = (n: number) => Math.round(n * 100)
  return (
    cents(a.breakdown.finalPrice) === cents(b.breakdown.finalPrice) &&
    cents(a.breakdown.totalCost) === cents(b.breakdown.totalCost)
  )
}

/**
 * Which change would alter a draft item's price; null when repricing changes nothing.
 * Catalog: today's catalog with the item's own mode vs the stored result. Margin: today's mode vs the item's mode.
 */
export function draftOutdated(
  quote: Quote,
  catalog: Catalog,
  mode: MarginMode,
): { catalog: boolean; margin: boolean } | null {
  if (quote.status !== 'draft') return null
  const flags = { catalog: false, margin: false }
  for (const item of quote.items) {
    if (item.input.kind === 'custom') continue
    const itemMode = item.result.breakdown.marginMode ?? 'empresa'
    const withItemMode = tryPriceItem(catalog, item.input, itemMode)
    if (withItemMode ? !samePrice(withItemMode, item.result) : quote.pricingVersion !== catalog.config.version) {
      flags.catalog = true
    }
    if (itemMode !== mode && withItemMode) {
      const withMode = tryPriceItem(catalog, item.input, mode)
      if (withMode && !samePrice(withMode, withItemMode)) flags.margin = true
    }
  }
  return flags.catalog || flags.margin ? flags : null
}

/** Catalog versions are `YYYY-MM-DD` or a UTC ISO timestamp to the minute (see `bumpVersion`). */
export function catalogVersionDate(version: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(version)) {
    const [y, m, d] = version.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(version)) return new Date(`${version}Z`)
  return null
}

/** Latest known date behind the outdated flags; null when no date is known. */
export function outdatedSince(
  flags: { catalog: boolean; margin: boolean },
  catalog: Catalog,
  marginModeChangedAt?: string,
): Date | null {
  const times = [
    flags.catalog ? catalogVersionDate(catalog.config.version)?.getTime() : undefined,
    flags.margin && marginModeChangedAt ? new Date(marginModeChangedAt).getTime() : undefined,
  ].filter((t): t is number => t !== undefined && !Number.isNaN(t))
  return times.length ? new Date(Math.max(...times)) : null
}

/** Reprices catalog items with today's catalog and mode. Items that no longer price keep their result. */
export function repriceDraft(
  quote: Quote,
  catalog: Catalog,
  mode: MarginMode,
): { quote: Quote; failed: number } {
  if (quote.status !== 'draft') throw new Error('Só rascunhos podem ser recalculados')
  let failed = 0
  const items = quote.items.map((item) => {
    if (item.input.kind === 'custom') return item
    try {
      return { ...item, result: priceItem(catalog, item.input, mode) }
    } catch {
      failed += 1
      return item
    }
  })
  return {
    quote: recomputeTotals({
      ...quote,
      items,
      marginMode: mode,
      pricingVersion: catalog.config.version,
    }),
    failed,
  }
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
    additionalCosts: dropEmptyFreight(clone.additionalCosts),
  })
}

export const DEFAULT_SHARE_CTA = 'Gostaria de realizar o pedido?'

/** Cliente vê tipo e cor/espessura — sem medidas */
function shareItemBlock(item: QuoteItem, index: number): string {
  const { title, spec } = describeItem(item.input)
  const lines = [`*${index + 1}. ${title}*`]
  if (spec) lines.push(spec)
  const note = itemNote(item.input)
  if (note) lines.push(`_Obs.: ${note}_`)
  lines.push(formatBrl(item.result.breakdown.finalPrice))
  if (item.input.kind !== 'custom') {
    for (const extra of item.input.extras) {
      const description = extra.description.trim()
      if (!description || extra.amount <= 0) continue
      lines.push(`• ${description} — ${formatBrl(extra.amount)}`)
    }
  }
  return lines.join('\n')
}

export function resolveQuoteValidUntil(
  quote: Quote,
  validityDays: number = DEFAULT_VALIDITY_DAYS,
): string {
  const issuedAt = new Date(quote.emittedAt ?? quote.updatedAt)
  return quote.validUntil ?? computeValidUntil(issuedAt, validityDays)
}

export function formatValidUntilDate(validUntilIso: string): string {
  return new Date(validUntilIso).toLocaleDateString('pt-BR')
}

/** Número exibido ao cliente (sem prefixo interno ORC-). */
export function displayQuoteNumber(number: string): string {
  return number.replace(/^ORC-/i, '')
}

/** Código exibido no PDF e no WhatsApp. */
export function formatDisplayQuoteCode(number: string, revision: number): string {
  return `${displayQuoteNumber(number)}-${revision}`
}

/** Nome do PDF: código + primeiro nome do cliente, sem caracteres inválidos em arquivo. */
export function quotePdfFilename(quote: Quote): string {
  const code = formatDisplayQuoteCode(quote.number, quote.revision)
  const firstName = (quote.customer.name ?? '')
    .trim()
    .split(/\s+/)[0]
    .replace(/[\\/:*?"<>|.]/g, '')
  return `${firstName ? `${code}-${firstName}` : code}.pdf`
}

/** Texto curto pra WhatsApp e folha de compartilhar. Sem endereço. */
export function quoteShareText(
  quote: Quote,
  options?: { shopName?: string; cta?: string; validityDays?: number },
): string {
  const code = formatDisplayQuoteCode(quote.number, quote.revision)
  const validityDays = options?.validityDays ?? DEFAULT_VALIDITY_DAYS
  const validUntilLine = `_Validade da proposta: ${formatValidUntilDate(resolveQuoteValidUntil(quote, validityDays))}_`
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
    '',
    validUntilLine,
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

import type { CorrerSubtype, EspelhoFinish, ProductKind } from '../domain/types'

/** Raw item form fields as typed (strings stay strings: half-typed values survive). */
export interface ItemFormState {
  kind: ProductKind
  spanCm: string
  widthMm: string
  heightMm: string
  glassColor: string
  profileColor: string
  thicknessMm: string
  subtype: CorrerSubtype
  hasLatch: boolean
  finish: EspelhoFinish
  espelhoColor: string
  espelhoThickness: string
  markup: string
  extraRows: { description: string; amount: string; committed: boolean }[]
  customDesc: string
  customAmount: string
  note: string
}

/** Device-only; never part of the quote, its totals, PDF or share text. */
export interface ItemDraftRecord {
  create?: ItemFormState
  edits: Record<string, ItemFormState>
  savedAt: string
}

const keyFor = (quoteId: string) => `app-vidros:item-draft:${quoteId}`

function defaultStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

const isState = (value: unknown): value is ItemFormState =>
  typeof value === 'object' && value !== null && typeof (value as ItemFormState).kind === 'string'

export function readItemDraft(quoteId: string, store = defaultStorage()): ItemDraftRecord | null {
  try {
    const raw = store?.getItem(keyFor(quoteId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ItemDraftRecord>
    const edits = Object.fromEntries(
      Object.entries(parsed.edits ?? {}).filter(([, state]) => isState(state)),
    ) as Record<string, ItemFormState>
    const create = isState(parsed.create) ? parsed.create : undefined
    if (!create && Object.keys(edits).length === 0) return null
    return { create, edits, savedAt: String(parsed.savedAt ?? '') }
  } catch {
    return null
  }
}

function write(quoteId: string, record: ItemDraftRecord, store: Storage | null): ItemDraftRecord | null {
  const empty = !record.create && Object.keys(record.edits).length === 0
  try {
    if (empty) store?.removeItem(keyFor(quoteId))
    else store?.setItem(keyFor(quoteId), JSON.stringify(record))
  } catch {
    // quota / private mode: the draft lives only until the page closes
  }
  return empty ? null : record
}

const current = (quoteId: string, store: Storage | null): ItemDraftRecord =>
  readItemDraft(quoteId, store) ?? { edits: {}, savedAt: '' }

export function saveCreateDraft(quoteId: string, state: ItemFormState, store = defaultStorage()) {
  return write(quoteId, { ...current(quoteId, store), create: state, savedAt: new Date().toISOString() }, store)
}

export function saveEditDraft(
  quoteId: string,
  itemId: string,
  state: ItemFormState,
  store = defaultStorage(),
) {
  const record = current(quoteId, store)
  return write(
    quoteId,
    { ...record, edits: { ...record.edits, [itemId]: state }, savedAt: new Date().toISOString() },
    store,
  )
}

export function clearCreateDraft(quoteId: string, store = defaultStorage()) {
  const { create: _drop, ...rest } = current(quoteId, store)
  return write(quoteId, rest, store)
}

export function clearEditDraft(quoteId: string, itemId: string, store = defaultStorage()) {
  const record = current(quoteId, store)
  const { [itemId]: _drop, ...edits } = record.edits
  return write(quoteId, { ...record, edits }, store)
}

/** Drops drafts of quotes that are gone (deleted elsewhere, or never saved). */
export function pruneItemDrafts(keepQuoteIds: ReadonlySet<string>, store = defaultStorage()) {
  if (!store) return
  const prefix = keyFor('')
  const stale: string[] = []
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i)
    if (key?.startsWith(prefix) && !keepQuoteIds.has(key.slice(prefix.length))) stale.push(key)
  }
  for (const key of stale) store.removeItem(key)
}

export function clearItemDrafts(quoteId: string, store = defaultStorage()) {
  try {
    store?.removeItem(keyFor(quoteId))
  } catch {
    // nothing stored
  }
}

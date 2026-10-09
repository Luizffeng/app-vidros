import { resolveQuoteValidUntil } from './quote'
import type { AppSettings, Quote } from './types'

export const EXPIRING_DAYS = 7

export interface QuoteTileSummary {
  /** Emitted, valid until today … today + 7 days (inclusive). */
  expiring: number
  drafts: number
  emitted: number
  total: number
}

export type SettingsPending = 'missing-name' | 'missing-phone'

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export function quoteTileSummary(
  quotes: readonly Quote[],
  now: Date,
  validityDays?: number,
): QuoteTileSummary {
  const today = startOfDay(now).getTime()
  const limit = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + EXPIRING_DAYS)).getTime()
  let expiring = 0
  let drafts = 0
  let emitted = 0
  for (const quote of quotes) {
    if (quote.status === 'draft') {
      drafts += 1
      continue
    }
    emitted += 1
    const until = startOfDay(new Date(resolveQuoteValidUntil(quote, validityDays))).getTime()
    if (until >= today && until <= limit) expiring += 1
  }
  return { expiring, drafts, emitted, total: quotes.length }
}

/** Date of a catalog version from `bumpCatalogVersion` (`YYYY-MM-DD` or `YYYY-MM-DDTHH:MM`). */
export function catalogUpdatedOn(version: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2})?$/.exec(version.trim())
  if (!match) return null
  const [, y, m, d] = match.map(Number)
  const date = new Date(y, m - 1, d)
  return date.getMonth() === m - 1 && date.getDate() === d ? date : null
}

/** Shop data the PDF and WhatsApp text need. */
export function settingsPending(settings: AppSettings): SettingsPending[] {
  const est = settings.establishment
  const pending: SettingsPending[] = []
  if (!est.name?.trim() && !est.tradeName?.trim()) pending.push('missing-name')
  if (!est.phone?.trim()) pending.push('missing-phone')
  return pending
}

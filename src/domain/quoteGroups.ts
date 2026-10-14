import type { Quote } from './types'

/** All revisions of one quote number, newest first. */
export interface QuoteGroup {
  number: string
  revisions: Quote[]
}

/** Date shown for a quote in the list: emission for emitted, last edit for drafts. */
export function quoteListIso(quote: Quote): string {
  return quote.status === 'emitted' ? quote.emittedAt ?? quote.updatedAt : quote.updatedAt
}

/** Groups by quote number, keeping the input order of the first revision seen. */
export function groupRevisions(quotes: Quote[]): QuoteGroup[] {
  const groups = new Map<string, Quote[]>()
  for (const quote of quotes) {
    const list = groups.get(quote.number)
    if (list) list.push(quote)
    else groups.set(quote.number, [quote])
  }
  return [...groups].map(([number, revisions]) => ({
    number,
    revisions: revisions.sort(
      (a, b) => quoteListIso(b).localeCompare(quoteListIso(a)) || b.revision - a.revision,
    ),
  }))
}

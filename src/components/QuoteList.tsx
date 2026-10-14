import { useRef, useSyncExternalStore } from 'react'
import { formatBrl, formatQuoteCode } from '../domain/quote'
import { quoteListIso, type QuoteGroup } from '../domain/quoteGroups'
import type { Quote } from '../domain/types'
import { useDismiss } from './useDismiss'

/** Same breakpoint as the 1-column list in index.css. */
const DESKTOP = '(min-width: 721px)'

export function QuoteList({
  groups,
  expanded,
  onToggle,
  onCollapse,
  onOpen,
}: {
  groups: QuoteGroup[]
  expanded: ReadonlySet<string>
  onToggle: (number: string) => void
  onCollapse: () => void
  onOpen: (id: string) => void
}) {
  const desktop = useMediaQuery(DESKTOP)
  const openRef = useRef<HTMLLIElement>(null)
  const anyOpen = groups.some((g) => g.revisions.length > 1 && expanded.has(g.number))
  // Desktop opens over the next rows like a popover; phones push the list down and stay open.
  useDismiss(desktop && anyOpen, openRef, onCollapse)

  return (
    <ul className="quote-list">
      {groups.map(({ number, revisions }) => {
        const [head] = revisions
        const many = revisions.length > 1
        const open = many && expanded.has(number)
        return (
          <li
            key={number}
            ref={open ? openRef : undefined}
            className={`quote-group${open ? ' quote-group--open' : ''}`}
          >
            <button
              type="button"
              className="quote-card"
              aria-expanded={many ? open : undefined}
              onClick={() => (many ? onToggle(number) : onOpen(head.id))}
            >
              <span className="quote-card__title">{formatQuoteCode(head.number, head.revision)}</span>
              <span className="quote-card__total">{formatBrl(head.grandTotal)}</span>
              <span className="quote-card__meta">
                <span className="quote-card__name">{head.customer.name || 'Sem cliente'}</span>
              </span>
              <span className="quote-card__date">{listDate(head)}</span>
              <StatusText quote={head} />
              {many && (
                <span className="quote-card__revs">
                  {revisions.length} revisões
                  <ChevronIcon />
                </span>
              )}
            </button>
            {open && (
              <ul className="quote-revs" aria-label="Revisões">
                {revisions.map((q) => (
                  <li key={q.id}>
                    <button type="button" className="quote-rev" onClick={() => onOpen(q.id)}>
                      <span className="quote-rev__code">Revisão {q.revision}</span>
                      <span className="quote-rev__total">{formatBrl(q.grandTotal)}</span>
                      <StatusText quote={q} />
                      <span className="quote-rev__date">{listDate(q)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', notify)
      return () => list.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
  )
}

function listDate(quote: Quote): string {
  return new Date(quoteListIso(quote)).toLocaleDateString('pt-BR')
}

function StatusText({ quote }: { quote: Quote }) {
  const emitted = quote.status === 'emitted'
  return (
    <span className={`quote-card__status quote-card__status--${emitted ? 'emitted' : 'draft'}`}>
      {emitted ? 'Emitido' : 'Rascunho'}
    </span>
  )
}

function ChevronIcon() {
  return (
    <svg className="quote-card__chevron" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 9l6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

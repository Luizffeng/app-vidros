import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motionMs } from './usePresence'

export function CollapsibleSection({
  title,
  count,
  actions,
  defaultOpen = false,
  onToggle,
  className,
  children,
}: {
  title: ReactNode
  count?: ReactNode
  /** Buttons before the chevron, shown only while open. Clicking them does not toggle. */
  actions?: ReactNode
  defaultOpen?: boolean
  onToggle?: (open: boolean) => void
  className?: string
  children: ReactNode
}) {
  const rootRef = useRef<HTMLDetailsElement>(null)
  const [open, setOpen] = useState(defaultOpen)
  // Animate only after the user toggles, so screens mount without motion.
  const [animate, setAnimate] = useState(false)

  // While the section height animates open, scroll in lockstep so the page
  // follows the expansion (instead of expand-then-jump). One rAF loop for
  // ~dur-md — cheap; only runs on user open.
  useEffect(() => {
    if (!open || !animate) return
    const el = rootRef.current
    if (!el) return

    const headPad = 56
    const footPad = 88
    const duration = motionMs('md') + 48
    const started = performance.now()
    let raf = 0

    const frame = (now: number) => {
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      const overflowBottom = rect.bottom - (vh - footPad)
      if (overflowBottom > 0) {
        window.scrollBy(0, overflowBottom)
      } else if (rect.top < headPad) {
        window.scrollBy(0, rect.top - headPad)
      }
      if (now - started < duration) {
        raf = requestAnimationFrame(frame)
      }
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [open, animate])

  return (
    <details
      ref={rootRef}
      className={`section collapsible-section${animate ? ' collapsible-section--animate' : ''}${className ? ` ${className}` : ''}`}
      open={open}
      onToggle={(e) => {
        const next = e.currentTarget.open
        if (next === open) return
        setOpen(next)
        onToggle?.(next)
      }}
    >
      <summary className="collapsible-section__summary" onClick={() => setAnimate(true)}>
        <span className="collapsible-section__heading">{title}</span>
        {count != null && <span className="pill">{count}</span>}
        {actions && open && (
          <span className="collapsible-section__actions" onClick={(e) => e.preventDefault()}>
            {actions}
          </span>
        )}
        <span className="collapsible-section__chevron" aria-hidden>
          <ChevronIcon />
        </span>
      </summary>
      <div className="collapsible-section__body">{children}</div>
    </details>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
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

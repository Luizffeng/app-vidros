import { useState, type ReactNode } from 'react'

export function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  className,
  children,
}: {
  title: ReactNode
  count?: ReactNode
  defaultOpen?: boolean
  className?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  // Animate only after the user toggles, so screens mount without motion.
  const [animate, setAnimate] = useState(false)
  return (
    <details
      className={`section collapsible-section${animate ? ' collapsible-section--animate' : ''}${className ? ` ${className}` : ''}`}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="collapsible-section__summary" onClick={() => setAnimate(true)}>
        <span className="collapsible-section__heading">{title}</span>
        {count != null && <span className="pill">{count}</span>}
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

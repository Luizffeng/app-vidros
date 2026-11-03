import type { ReactNode, Ref } from 'react'
import { IconButton } from './IconButton'

export function Banner({
  tone,
  actions,
  onDismiss,
  className,
  ref,
  children,
}: {
  tone: 'ok' | 'warn' | 'error'
  actions?: ReactNode
  /** X à direita. Esconde o aviso só nesta visita. */
  onDismiss?: () => void
  className?: string
  ref?: Ref<HTMLDivElement>
  children: ReactNode
}) {
  const row = Boolean(actions || onDismiss)
  const classes = `banner banner--${tone}${row ? ' banner--actions' : ''}${onDismiss ? ' banner--dismiss' : ''}${className ? ` ${className}` : ''}`
  return (
    <div ref={ref} className={classes} role={tone === 'error' ? 'alert' : 'status'}>
      {row ? (
        <>
          <span className="banner__text">{children}</span>
          {actions && <span className="banner__actions">{actions}</span>}
          {onDismiss && (
            <IconButton label="Fechar aviso" size="sm" onClick={onDismiss}>
              <CloseIcon />
            </IconButton>
          )}
        </>
      ) : (
        children
      )}
    </div>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

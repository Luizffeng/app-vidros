import type { ReactNode, Ref } from 'react'

export function Banner({
  tone,
  actions,
  className,
  ref,
  children,
}: {
  tone: 'ok' | 'warn' | 'error'
  actions?: ReactNode
  className?: string
  ref?: Ref<HTMLDivElement>
  children: ReactNode
}) {
  const classes = `banner banner--${tone}${actions ? ' banner--actions' : ''}${className ? ` ${className}` : ''}`
  return (
    <div ref={ref} className={classes} role={tone === 'error' ? 'alert' : 'status'}>
      {actions ? (
        <>
          <span className="banner__text">{children}</span>
          <span className="banner__actions">{actions}</span>
        </>
      ) : (
        children
      )}
    </div>
  )
}

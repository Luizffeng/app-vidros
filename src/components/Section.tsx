import { useId, type HTMLAttributes, type ReactNode } from 'react'

export function Section({
  title,
  count,
  hint,
  actions,
  className,
  children,
  ...rest
}: Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  title: ReactNode
  count?: ReactNode
  hint?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  const titleId = useId()
  return (
    <section className={`section${className ? ` ${className}` : ''}`} aria-labelledby={titleId} {...rest}>
      <div className="section-head">
        <h2 id={titleId}>{title}</h2>
        {count != null && <span className="pill">{count}</span>}
        {actions && <div className="section-head__actions">{actions}</div>}
      </div>
      {hint && <p className="section-hint">{hint}</p>}
      {children}
    </section>
  )
}

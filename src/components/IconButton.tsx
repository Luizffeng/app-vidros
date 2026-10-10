import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'

const TONES = {
  default: '',
  edit: ' btn-icon--edit',
  danger: ' btn-icon--danger',
  'danger-solid': ' danger-solid',
  revise: ' revise',
} as const

/**
 * Icon-only button; `label` is the accessible name and the tooltip.
 * `md`: square control in headers and action bars. `sm`: bare icon inside a list row.
 */
export function IconButton({
  label,
  size = 'md',
  tone = 'default',
  className,
  children,
  ref,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'title' | 'type'> & {
  label: string
  size?: 'md' | 'sm'
  tone?: keyof typeof TONES
  children: ReactNode
  ref?: Ref<HTMLButtonElement>
}) {
  const classes = `btn btn-icon${size === 'sm' ? ' btn-icon--sm' : ''}${TONES[tone]}${className ? ` ${className}` : ''}`
  return (
    <button ref={ref} type="button" className={classes} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  )
}

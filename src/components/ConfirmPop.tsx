import type { ReactNode } from 'react'
import { Presence } from './usePresence'

/**
 * Small confirm next to its trigger. The parent wraps trigger + pop in a
 * `position: relative` box. `place`: left of the trigger, below or above it
 * (right-aligned), or in the flow (`static`). `block` puts the message above the buttons.
 */
export function ConfirmPop({
  open,
  label,
  message,
  place = 'left',
  block = false,
  alert = false,
  warn = false,
  tone = 'danger',
  yesLabel = 'Sim',
  noLabel = 'Não',
  busy,
  onYes,
  onNo,
}: {
  open: boolean
  label: string
  message: ReactNode
  place?: 'left' | 'below' | 'above' | 'static'
  block?: boolean
  /** role="alertdialog": the user must answer before going on. */
  alert?: boolean
  /** Red border: the message is a blocker, not a question. */
  warn?: boolean
  tone?: 'danger' | 'primary'
  yesLabel?: string
  noLabel?: string
  busy?: boolean
  onYes: () => void
  /** Omit for a single action. */
  onNo?: () => void
}) {
  const classes = [
    'confirm-pop',
    `confirm-pop--${place}`,
    block ? 'confirm-pop--block' : null,
    warn ? 'confirm-pop--warn' : null,
  ]
    .filter(Boolean)
    .join(' ')
  const yes = (
    <button
      type="button"
      className={tone === 'primary' ? 'btn primary' : 'btn confirm-pop__yes'}
      disabled={busy}
      onClick={onYes}
    >
      {yesLabel}
    </button>
  )
  const no = onNo && (
    <button type="button" className="btn" onClick={onNo}>
      {noLabel}
    </button>
  )
  return (
    <Presence open={open}>
      {(state) => (
        <div className={classes} role={alert ? 'alertdialog' : 'dialog'} aria-label={label} data-state={state}>
          <span>{message}</span>
          {block ? (
            <span className="confirm-pop__actions">
              {yes}
              {no}
            </span>
          ) : (
            <>
              {yes}
              {no}
            </>
          )}
        </div>
      )}
    </Presence>
  )
}

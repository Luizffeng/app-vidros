import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { bindLeaveAsk } from '../nav/navigator'
import { ConfirmPop } from './ConfirmPop'
import { Presence } from './usePresence'

/**
 * Screen-level ConfirmPop for useLeaveGuard. No history entry of its own:
 * device back is answered in the navigator (a layer here would be popped
 * by the menu closing on the same click).
 */
export function LeaveGuard() {
  const [prompt, setPrompt] = useState<{ message: string; answer: (ok: boolean) => void } | null>(null)
  const shown = useRef('')
  if (prompt) shown.current = prompt.message

  useLayoutEffect(() => {
    return bindLeaveAsk((message, answer) => {
      setPrompt(message ? { message, answer } : null)
    })
  }, [])

  const open = prompt !== null

  useEffect(() => {
    if (!prompt) return
    const answer = prompt.answer
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      answer(false)
    }
    window.addEventListener('keydown', onKey, true)
    document
      .querySelector<HTMLButtonElement>('.leave-guard .confirm-pop .btn:not(.confirm-pop__yes)')
      ?.focus({ preventScroll: true })
    return () => window.removeEventListener('keydown', onKey, true)
  }, [prompt])

  const reply = (ok: boolean) => prompt?.answer(ok)

  return createPortal(
    <Presence open={open}>
      {(state) => (
        <div
          className="leave-guard"
          data-state={state}
          role="presentation"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) reply(false)
          }}
        >
          <ConfirmPop
            open={open}
            place="static"
            block
            alert
            label="Alterações não salvas"
            message={prompt?.message ?? shown.current}
            onYes={() => reply(true)}
            onNo={() => reply(false)}
          />
        </div>
      )}
    </Presence>,
    document.body,
  )
}

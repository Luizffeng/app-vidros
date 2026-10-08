import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motionMs } from './usePresence'

export function Modal({
  title,
  onClose,
  children,
  className,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [closing, setClosing] = useState(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const closeTimerRef = useRef<number | undefined>(undefined)

  // Button, Esc and backdrop play the exit first; parent-driven unmounts stay instant.
  const requestClose = () => {
    if (closeTimerRef.current !== undefined) return
    setClosing(true)
    closeTimerRef.current = window.setTimeout(() => onCloseRef.current(), motionMs('sm'))
  }
  const requestCloseRef = useRef(requestClose)
  requestCloseRef.current = requestClose

  useEffect(() => {
    const scrollY = window.scrollY
    const { body } = document
    const prevOverflow = body.style.overflow
    const prevPosition = body.style.position
    const prevTop = body.style.top
    const prevWidth = body.style.width

    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestCloseRef.current()
    }
    window.addEventListener('keydown', onKey)

    const focusable = panelRef.current?.querySelector<HTMLElement>(
      '.modal__body input:not([type="hidden"]), .modal__body select, .modal__body textarea',
    )
    focusable?.focus({ preventScroll: true })

    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = undefined
      body.style.overflow = prevOverflow
      body.style.position = prevPosition
      body.style.top = prevTop
      body.style.width = prevWidth
      window.scrollTo(0, scrollY)
    }
  }, [])

  return createPortal(
    <div
      className="modal-backdrop"
      role="presentation"
      data-state={closing ? 'closing' : 'open'}
      onClick={requestClose}
    >
      <div
        ref={panelRef}
        className={className ? `modal ${className}` : 'modal'}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <h3>{title}</h3>
          <button type="button" className="btn ghost" onClick={requestClose}>
            Fechar
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

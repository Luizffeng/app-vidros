import { useEffect, useRef, type RefObject } from 'react'
import { useBackLayer } from '../nav/useBackLayer'

export type DismissReason = 'outside' | 'escape' | 'back'

/** Fecha popovers ao tocar/clicar fora de `containerRef`, ao apertar Esc ou no voltar do aparelho. */
export function useDismiss(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onDismiss: (reason: DismissReason) => void,
) {
  const onDismissRef = useRef(onDismiss)
  useEffect(() => {
    onDismissRef.current = onDismiss
  })
  useBackLayer(open, () => onDismissRef.current('back'))

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && containerRef.current?.contains(target)) return
      onDismissRef.current('outside')
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onDismissRef.current('escape')
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, containerRef])
}

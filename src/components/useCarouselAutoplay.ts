import { useEffect, useRef, useState, type RefObject } from 'react'

export const BANNER_INTERVAL_MS = 5000

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/**
 * Advances every 5 s while nobody holds, focuses or scrolls past the carousel and the page is
 * visible. Any slide change (swipe, dot) restarts the count; reduced motion turns it off.
 */
export function useCarouselAutoplay(
  rootRef: RefObject<HTMLElement | null>,
  count: number,
  active: number,
  goTo: (index: number) => void,
) {
  const reduced = useReducedMotion()
  const [held, setHeld] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  const [offscreen, setOffscreen] = useState(false)
  const goToRef = useRef(goTo)
  useEffect(() => {
    goToRef.current = goTo
  })

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const hold = () => setHeld(true)
    const release = () => setHeld(false)
    const onFocusIn = () => setFocused(true)
    const onFocusOut = (event: FocusEvent) => {
      if (!(event.relatedTarget instanceof Node && root.contains(event.relatedTarget))) setFocused(false)
    }
    const onVisibility = () => setHidden(document.hidden)
    const observer = new IntersectionObserver(([entry]) => setOffscreen(entry.intersectionRatio < 0.5), {
      threshold: [0, 0.5, 1],
    })
    root.addEventListener('pointerdown', hold)
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
    root.addEventListener('focusin', onFocusIn)
    root.addEventListener('focusout', onFocusOut)
    document.addEventListener('visibilitychange', onVisibility)
    observer.observe(root)
    return () => {
      root.removeEventListener('pointerdown', hold)
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
      root.removeEventListener('focusin', onFocusIn)
      root.removeEventListener('focusout', onFocusOut)
      document.removeEventListener('visibilitychange', onVisibility)
      observer.disconnect()
    }
  }, [rootRef])

  const paused = reduced || held || focused || hidden || offscreen || count < 2
  useEffect(() => {
    if (paused) return
    const id = window.setTimeout(() => goToRef.current((active + 1) % count), BANNER_INTERVAL_MS)
    return () => window.clearTimeout(id)
  }, [paused, active, count])

  return { reduced }
}

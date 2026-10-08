import { useEffect } from 'react'

/**
 * Sets `data-at-top` / `data-at-end` on `<html>` for the header and action bar edges.
 * CSS scroll timelines keep a stale value when the page stops being scrollable (e.g. a
 * section collapses), so this tracks scroll, resize and content size instead.
 */
export function useScrollEdges() {
  useEffect(() => {
    const root = document.documentElement
    let frame = 0

    const update = () => {
      frame = 0
      // Modal scroll lock fixes <body>; the page has not really moved.
      if (document.body.style.position === 'fixed') return
      const y = window.scrollY
      root.toggleAttribute('data-at-top', y <= 1)
      root.toggleAttribute('data-at-end', y + window.innerHeight >= root.scrollHeight - 1)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const observer = new ResizeObserver(schedule)
    observer.observe(document.body)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      observer.disconnect()
    }
  }, [])
}

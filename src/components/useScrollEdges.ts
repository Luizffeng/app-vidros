import { useEffect } from 'react'

/** Scroll distance over which the header line fades in and the action bar fade fades out. */
const EDGE_RANGE_PX = 32

/**
 * Sets `--head-edge` (0 at the top, 1 after scrolling) and `--bar-edge` (1 until near the
 * end, 0 at the end) on `<html>` for the header and action bar edges. CSS scroll timelines
 * keep a stale value when the page stops being scrollable (e.g. a section collapses), so
 * this tracks scroll, resize and content size instead.
 */
export function useScrollEdges() {
  useEffect(() => {
    const root = document.documentElement
    let frame = 0
    let head = ''
    let bar = ''

    const progress = (px: number) => (Math.min(Math.max(px, 0), EDGE_RANGE_PX) / EDGE_RANGE_PX).toFixed(2)

    const update = () => {
      frame = 0
      // Modal scroll lock fixes <body>; the page has not really moved.
      if (document.body.style.position === 'fixed') return
      const y = window.scrollY
      const nextHead = progress(y)
      const nextBar = progress(root.scrollHeight - window.innerHeight - y)
      if (nextHead !== head) root.style.setProperty('--head-edge', (head = nextHead))
      if (nextBar !== bar) root.style.setProperty('--bar-edge', (bar = nextBar))
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

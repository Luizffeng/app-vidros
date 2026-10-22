import { useEffect } from 'react'

/**
 * Keeps `--vv-height` and `--keyboard-inset` on `:root` in sync with
 * `visualViewport` so sticky modal footers can sit above the soft keyboard.
 */
export function useVisualViewportVars(active: boolean) {
  useEffect(() => {
    if (!active) return
    const root = document.documentElement
    const vv = window.visualViewport

    const apply = () => {
      if (!vv) {
        root.style.setProperty('--vv-height', `${window.innerHeight}px`)
        root.style.setProperty('--keyboard-inset', '0px')
        return
      }
      const height = Math.round(vv.height)
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
      root.style.setProperty('--vv-height', `${height}px`)
      root.style.setProperty('--keyboard-inset', `${inset}px`)
    }

    apply()
    vv?.addEventListener('resize', apply)
    vv?.addEventListener('scroll', apply)
    window.addEventListener('resize', apply)
    return () => {
      vv?.removeEventListener('resize', apply)
      vv?.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
      root.style.setProperty('--keyboard-inset', '0px')
    }
  }, [active])
}

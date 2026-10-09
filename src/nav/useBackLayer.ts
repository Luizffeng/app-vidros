import { useEffect, useRef } from 'react'
import { pushLayer } from './navigator'

/**
 * While `open`, the overlay owns one history entry: the device back calls `onBack`
 * instead of leaving the screen. Closing it through the UI removes the entry.
 */
export function useBackLayer(open: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack)
  useEffect(() => {
    onBackRef.current = onBack
  })

  useEffect(() => {
    if (!open) return
    const release = pushLayer(() => onBackRef.current())
    return () => release(true)
  }, [open])
}

import { useEffect, useState, type ReactNode } from 'react'

export type MotionDuration = 'xs' | 'sm' | 'md' | 'lg'
export type PresenceState = 'open' | 'closing'

const FALLBACK_MS: Record<MotionDuration, number> = { xs: 100, sm: 150, md: 200, lg: 250 }

/** Reads `--dur-*` from `:root`, so reduced motion shortens JS timers too. */
export function motionMs(duration: MotionDuration): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--dur-${duration}`).trim()
  const n = Number.parseFloat(raw)
  if (Number.isNaN(n)) return FALLBACK_MS[duration]
  return raw.endsWith('ms') ? n : n * 1000
}

/** Keeps a closing overlay mounted for its exit animation; reopening cancels the exit. */
export function usePresence(open: boolean, exit: MotionDuration) {
  const [mounted, setMounted] = useState(open)
  if (open && !mounted) setMounted(true)

  useEffect(() => {
    if (open || !mounted) return
    const id = window.setTimeout(() => setMounted(false), motionMs(exit))
    return () => window.clearTimeout(id)
  }, [open, mounted, exit])

  const state: PresenceState = open ? 'open' : 'closing'
  return { mounted: open || mounted, state }
}

export function Presence({
  open,
  exit = 'xs',
  children,
}: {
  open: boolean
  exit?: MotionDuration
  children: (state: PresenceState) => ReactNode
}) {
  const { mounted, state } = usePresence(open, exit)
  return mounted ? children(state) : null
}

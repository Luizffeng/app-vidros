import { useEffect } from 'react'
import { addGuard } from './navigator'

/** Asks before any screen change (device back, arrow, menu) while `active`. */
export function useLeaveGuard(active: boolean, message = 'Descartar as alterações não salvas?') {
  useEffect(() => {
    if (!active) return
    return addGuard(message)
  }, [active, message])
}

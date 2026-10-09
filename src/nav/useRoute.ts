import { useEffect, useState } from 'react'
import { getRoute, subscribe, type RouteSnapshot } from './navigator'

/**
 * Plain state, not useSyncExternalStore: a route change then batches with the state set
 * right before it (e.g. the quote being opened), so the next screen renders once.
 */
export function useRoute(): RouteSnapshot {
  const [snapshot, setSnapshot] = useState(getRoute)
  useEffect(() => {
    setSnapshot(getRoute())
    return subscribe(() => setSnapshot(getRoute()))
  }, [])
  return snapshot
}

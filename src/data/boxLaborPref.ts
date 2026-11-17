/** Last box labor choice the user saved on this device (both box kinds share it). */
const KEY = 'app-vidros:box-labor-fixed'

function defaultStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** Default for a new box item: last saved choice, else per m². */
export function readBoxLaborFixed(store = defaultStorage()): boolean {
  try {
    return store?.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** Call when the user saves a box or box fora do padrão. */
export function writeBoxLaborFixed(laborFixed: boolean, store = defaultStorage()): void {
  try {
    store?.setItem(KEY, laborFixed ? '1' : '0')
  } catch {
    // quota / private mode: next new item keeps the previous default
  }
}

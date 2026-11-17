import { describe, expect, it } from 'vitest'
import { readBoxLaborFixed, writeBoxLaborFixed } from './boxLaborPref'

function memoryStore(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (key) => {
      map.delete(key)
    },
    setItem: (key, value) => {
      map.set(key, value)
    },
  }
}

describe('boxLaborPref', () => {
  it('defaults to per m² when nothing was saved', () => {
    expect(readBoxLaborFixed(memoryStore())).toBe(false)
  })

  it('remembers the last saved choice', () => {
    const store = memoryStore()
    writeBoxLaborFixed(true, store)
    expect(readBoxLaborFixed(store)).toBe(true)
    writeBoxLaborFixed(false, store)
    expect(readBoxLaborFixed(store)).toBe(false)
  })
})

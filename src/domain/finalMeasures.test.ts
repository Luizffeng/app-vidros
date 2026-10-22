import { describe, expect, it } from 'vitest'
import { seedFinalMeasures } from './finalMeasures'
import type { ItemInput } from './types'

describe('seedFinalMeasures', () => {
  it('box: só largura em cm a partir do vão', () => {
    const input: ItemInput = {
      kind: 'box',
      spanCm: 125,
      glassColor: 'Incolor',
      profileColor: 'Fosco',
      markup: 0.3,
      extras: [],
    }
    expect(seedFinalMeasures(input)).toEqual([{ key: 'spanCm', label: 'Largura', value: '125', unit: 'cm' }])
  })

  it('correr: largura e altura em mm', () => {
    const input: ItemInput = {
      kind: 'correr',
      subtype: 'J2F',
      widthMm: 1500,
      heightMm: 2100,
      glassColor: 'Incolor',
      thicknessMm: '08',
      profileColor: 'Fosco',
      markup: 0.3,
      extras: [],
    }
    expect(seedFinalMeasures(input).map((f) => f.value)).toEqual(['1500', '2100'])
  })

  it('custom: campos livres vazios', () => {
    const seed = seedFinalMeasures({ kind: 'custom', description: 'X', amount: 10 })
    expect(seed).toHaveLength(6)
    expect(seed.every((f) => f.value === '')).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { priceItem } from '../domain/pricing'
import type { ItemInput } from '../domain/types'
import { normalizeCatalog } from './catalogItems'
import { roundExamplePrice, toExampleCatalog } from './exampleCatalog'
import { loadSeedCatalog } from './seedCatalog'

const seed = normalizeCatalog(loadSeedCatalog())
const example = normalizeCatalog(toExampleCatalog(seed))

describe('roundExamplePrice', () => {
  it('rounds by price range', () => {
    expect(roundExamplePrice(137.4)).toBe(140)
    expect(roundExamplePrice(234.9)).toBe(230)
    expect(roundExamplePrice(87.2)).toBe(85)
    expect(roundExamplePrice(33.9)).toBe(35)
    expect(roundExamplePrice(9.4)).toBe(9)
    expect(roundExamplePrice(0.3)).toBe(1)
    expect(roundExamplePrice(0)).toBe(0)
  })
})

describe('toExampleCatalog', () => {
  it('flags every row and the config, survives normalize', () => {
    expect(example.config.exemplo).toBe(true)
    for (const table of ['vidros', 'kitBox', 'acessorios', 'aluminios'] as const) {
      expect(example[table].length).toBe(seed[table].length)
      expect(example[table].every((row) => row.exemplo === true)).toBe(true)
    }
  })

  it('uses round prices and re-derives aluminum per meter', () => {
    const round = (n: number | null) => n === null || n === roundExamplePrice(n)
    expect(example.vidros.every((v) => round(v.valorM2))).toBe(true)
    expect(example.kitBox.every((k) => round(k.valor))).toBe(true)
    expect(example.acessorios.every((a) => round(a.valor))).toBe(true)
    for (const a of example.aluminios) {
      expect(round(a.valorBarra)).toBe(true)
      expect(a.valorMetro).toBeCloseTo(a.valorBarra / a.metragemBarra, 2)
    }
  })

  it('keeps box and sliding window totals within 10% of the seed', () => {
    const inputs: ItemInput[] = [
      { kind: 'box', spanCm: 120, glassColor: 'Incolor', profileColor: 'Fosco', markup: 0.3, extras: [] },
      {
        kind: 'correr',
        subtype: 'J2F',
        widthMm: 1200,
        heightMm: 1000,
        glassColor: 'Incolor',
        thicknessMm: '08',
        profileColor: 'Fosco',
        markup: 0.3,
        extras: [],
      },
    ]
    for (const input of inputs) {
      const real = priceItem(seed, input).breakdown.finalPrice
      const fake = priceItem(example, input).breakdown.finalPrice
      expect(Math.abs(fake - real) / real).toBeLessThanOrEqual(0.1)
    }
  })
})

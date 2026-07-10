import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from '../../data/seedCatalog'
import {
  priceBox,
  priceCorrer,
  priceMaxiar,
  pricePivotante,
  priceFixo,
  priceEspelho,
} from './index'

const catalog = loadSeedCatalog()

describe('pricing parity with spreadsheet examples', () => {
  it('calc_BOX 140cm Incolor/Fosco markup 30%', () => {
    const r = priceBox(catalog, {
      kind: 'box',
      spanCm: 140,
      glassColor: 'Incolor',
      profileColor: 'Fosco',
      markup: 0.3,
      extras: 0,
    })
    expect(r.breakdown.labor).toBeCloseTo(159.6, 2)
    expect(r.breakdown.glass).toBeCloseTo(361.70395, 2)
    expect(r.breakdown.hardware).toBeCloseTo(156.8, 2)
    expect(r.breakdown.accessories).toBeCloseTo(30, 2)
    expect(r.breakdown.totalCost).toBeCloseTo(708.10395, 2)
    expect(r.breakdown.finalPrice).toBeCloseTo(920.535135, 2)
  })

  it('calc_CORRER J4F 1950x754 Verde 06 Fosco', () => {
    const r = priceCorrer(catalog, {
      kind: 'correr',
      subtype: 'J4F',
      widthMm: 1950,
      heightMm: 754,
      glassColor: 'Verde',
      thicknessMm: '06',
      profileColor: 'Fosco',
      markup: 0.3,
      extras: 0,
    })
    expect(r.breakdown.labor).toBeCloseTo(67.5, 1)
    expect(r.breakdown.glass).toBeCloseTo(219.744, 1)
    expect(r.breakdown.finalPrice).toBeCloseTo(626.9, 0)
  })

  it('calc_PIVOTANTE 795x2168 Incolor 08 Fosco with latch', () => {
    const r = pricePivotante(catalog, {
      kind: 'pivotante',
      widthMm: 795,
      heightMm: 2168,
      glassColor: 'Incolor',
      thicknessMm: '08',
      profileColor: 'Fosco',
      hasLatch: true,
      markup: 0.3,
      extras: 25,
    })
    expect(r.breakdown.labor).toBeCloseTo(81, 1)
    expect(r.breakdown.glass).toBeCloseTo(245.52, 1)
    expect(r.breakdown.finalPrice).toBeCloseTo(706.836, 0)
  })

  it('calc_MAXIAR 540x640 Incolor 08 Fosco', () => {
    const r = priceMaxiar(catalog, {
      kind: 'maxiar',
      widthMm: 540,
      heightMm: 640,
      glassColor: 'Incolor',
      thicknessMm: '08',
      profileColor: 'Fosco',
      markup: 0.5,
      extras: 0,
    })
    expect(r.breakdown.labor).toBeCloseTo(60, 1)
    expect(r.breakdown.glass).toBeCloseTo(49.941, 2)
    expect(r.breakdown.finalPrice).toBeCloseTo(296.61, 0)
  })

  it('vidro fixo prices with min area', () => {
    const r = priceFixo(catalog, {
      kind: 'fixo',
      widthMm: 400,
      heightMm: 400,
      glassColor: 'Incolor',
      thicknessMm: '08',
      markup: 0.3,
      extras: 0,
    })
    expect(r.breakdown.glass).toBeGreaterThan(0)
    expect(r.breakdown.finalPrice).toBeGreaterThan(r.breakdown.totalCost)
  })

  it('espelho lapidado prata', () => {
    const r = priceEspelho(catalog, {
      kind: 'espelho',
      finish: 'Espelho Lapidado',
      widthMm: 1000,
      heightMm: 800,
      glassColor: 'Prata',
      thicknessMm: '04',
      markup: 0.3,
      extras: 0,
    })
    expect(r.breakdown.glass).toBeGreaterThan(0)
    expect(r.kind).toBe('espelho')
  })
})

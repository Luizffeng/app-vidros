import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from '../../data/seedCatalog'
import {
  findKitBox,
  findVidro,
  priceBox,
  priceCorrer,
  priceCustom,
  priceEspelho,
  priceFixo,
  priceItem,
  priceMaxiar,
  pricePivotante,
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
      extras: [],
    })
    expect(r.breakdown.labor).toBeCloseTo(159.6, 2)
    expect(r.breakdown.glass).toBeCloseTo(361.70395, 2)
    expect(r.breakdown.hardware).toBeCloseTo(156.8, 2)
    expect(r.breakdown.accessories).toBeCloseTo(30, 2)
    expect(r.breakdown.totalCost).toBeCloseTo(708.10395, 2)
    expect(r.breakdown.finalPrice).toBeCloseTo(920.535135, 2)
  })

  it('calc_BOX 120cm Incolor/Fosco markup 30%', () => {
    const r = priceBox(catalog, {
      kind: 'box',
      spanCm: 120,
      glassColor: 'Incolor',
      profileColor: 'Fosco',
      markup: 0.3,
      extras: [],
    })
    expect(r.breakdown.labor).toBeCloseTo(136.8, 2)
    expect(r.breakdown.glass).toBeCloseTo(311.81375, 2)
    expect(r.breakdown.hardware).toBeCloseTo(117, 2)
    expect(r.breakdown.accessories).toBeCloseTo(30, 2)
    expect(r.breakdown.totalCost).toBeCloseTo(595.61375, 2)
    expect(r.breakdown.finalPrice).toBeCloseTo(774.297875, 2)
  })

  it('calc_BOX 140cm Incolor/Preto markup 30%', () => {
    const r = priceBox(catalog, {
      kind: 'box',
      spanCm: 140,
      glassColor: 'Incolor',
      profileColor: 'Preto',
      markup: 0.3,
      extras: [],
    })
    expect(r.breakdown.hardware).toBeCloseTo(156.81, 2)
    expect(r.breakdown.finalPrice).toBeCloseTo(920.548135, 2)
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
      extras: [],
    })
    expect(r.breakdown.labor).toBeCloseTo(67.5, 1)
    expect(r.breakdown.glass).toBeCloseTo(219.744, 1)
    expect(r.breakdown.finalPrice).toBeCloseTo(626.9, 0)
  })

  it('calc_CORRER J2F 1200x1000 Incolor 08 Fosco', () => {
    const r = priceCorrer(catalog, {
      kind: 'correr',
      subtype: 'J2F',
      widthMm: 1200,
      heightMm: 1000,
      glassColor: 'Incolor',
      thicknessMm: '08',
      profileColor: 'Fosco',
      markup: 0.3,
      extras: [],
    })
    expect(r.breakdown.labor).toBeCloseTo(54, 1)
    expect(r.breakdown.glass).toBeCloseTo(170.19, 2)
    expect(r.breakdown.aluminum).toBeCloseTo(87.3616666565, 4)
    expect(r.breakdown.finalPrice).toBeCloseTo(471.44716665345, 2)
  })

  it('calc_CORRER P2F 900x2100 Fume 08 Branco', () => {
    const r = priceCorrer(catalog, {
      kind: 'correr',
      subtype: 'P2F',
      widthMm: 900,
      heightMm: 2100,
      glassColor: 'Fume',
      thicknessMm: '08',
      profileColor: 'Branco',
      markup: 0.3,
      extras: [],
    })
    expect(r.breakdown.labor).toBeCloseTo(85.5, 1)
    expect(r.breakdown.glass).toBeCloseTo(330.2802, 2)
    expect(r.breakdown.finalPrice).toBeCloseTo(844.853739156375, 2)
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
      extras: [{ id: 'extra', description: 'Adicional', amount: 25 }],
    })
    expect(r.breakdown.labor).toBeCloseTo(81, 1)
    expect(r.breakdown.glass).toBeCloseTo(245.52, 1)
    expect(r.breakdown.finalPrice).toBeCloseTo(706.836, 0)
  })

  it('calc_PIVOTANTE 800x2100 Incolor 08 Fosco without latch', () => {
    const r = pricePivotante(catalog, {
      kind: 'pivotante',
      widthMm: 800,
      heightMm: 2100,
      glassColor: 'Incolor',
      thicknessMm: '08',
      profileColor: 'Fosco',
      hasLatch: false,
      markup: 0.3,
      extras: [],
    })
    expect(r.breakdown.labor).toBeCloseTo(76.5, 1)
    expect(r.breakdown.glass).toBeCloseTo(234.36, 2)
    expect(r.breakdown.hardware).toBeCloseTo(139.2, 1)
    expect(r.breakdown.finalPrice).toBeCloseTo(630.578, 2)
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
      extras: [],
    })
    expect(r.breakdown.labor).toBeCloseTo(60, 1)
    expect(r.breakdown.glass).toBeCloseTo(49.941, 2)
    expect(r.breakdown.finalPrice).toBeCloseTo(296.61, 0)
  })

  it('vidro fixo applies min 0.25 m² billed glass', () => {
    const r = priceFixo(catalog, {
      kind: 'fixo',
      widthMm: 400,
      heightMm: 400,
      glassColor: 'Incolor',
      thicknessMm: '08',
      markup: 0.3,
      extras: [],
    })
    expect(r.breakdown.glass).toBeCloseTo(34.875, 3)
    expect(r.breakdown.labor).toBeCloseTo(9, 2)
    expect(r.breakdown.accessories).toBeCloseTo(20, 2)
    expect(r.breakdown.finalPrice).toBeCloseTo(83.0375, 3)
    expect((r.notes ?? []).some((n) => n.includes('0,25'))).toBe(true)
  })

  it('vidro fixo large Verde 10', () => {
    const r = priceFixo(catalog, {
      kind: 'fixo',
      widthMm: 1200,
      heightMm: 1500,
      glassColor: 'Verde',
      thicknessMm: '10',
      markup: 0.3,
      extras: [],
    })
    expect(r.breakdown.glass).toBeCloseTo(482.76, 2)
    expect(r.breakdown.labor).toBeCloseTo(81, 1)
    expect(r.breakdown.finalPrice).toBeCloseTo(784.888, 2)
  })

  it('espelho lapidado prata 04', () => {
    const r = priceEspelho(catalog, {
      kind: 'espelho',
      finish: 'Espelho Lapidado',
      widthMm: 1000,
      heightMm: 800,
      glassColor: 'Prata',
      thicknessMm: '04',
      markup: 0.3,
      extras: [],
    })
    expect(r.kind).toBe('espelho')
    expect(r.breakdown.glass).toBeCloseTo(112.176, 3)
    expect(r.breakdown.labor).toBeCloseTo(36, 1)
    expect(r.breakdown.finalPrice).toBeCloseTo(192.6288, 3)
  })

  it('custom item uses amount as final price', () => {
    const r = priceCustom({
      kind: 'custom',
      description: 'Pelicula',
      amount: 150,
    })
    expect(r.breakdown.totalCost).toBe(150)
    expect(r.breakdown.finalPrice).toBe(150)
    expect(r.breakdown.marginAmount).toBe(0)
    expect(
      priceItem(catalog, {
        kind: 'custom',
        description: 'Pelicula',
        amount: 150,
      }).label,
    ).toBe('Pelicula')
  })
})

describe('inactive catalog items', () => {
  it('findVidro skips inactive SKU and uses next match', () => {
    const inactiveFirst = {
      ...catalog,
      vidros: catalog.vidros.map((v) =>
        v.tipo === 'Box' && v.cor === 'Incolor' && v.espessuraMm === '08'
          ? { ...v, ativo: false as const }
          : v,
      ),
    }
    expect(() => findVidro(inactiveFirst, 'Box', 'Incolor', '08')).toThrow(
      /Vidro sem preço/,
    )
  })

  it('findKitBox rejects inactive kit', () => {
    const inactiveKit = {
      ...catalog,
      kitBox: catalog.kitBox.map((k) =>
        k.cor === 'Fosco' && k.tamanhoCm === 150 ? { ...k, ativo: false as const } : k,
      ),
    }
    expect(() => findKitBox(inactiveKit, 'Fosco', 150)).toThrow(/Kit Box sem preço/)
  })

  it('priceBox fails when nearest kit is inactive', () => {
    // vão 140 cm resolve kit 150 cm
    const inactiveKit = {
      ...catalog,
      kitBox: catalog.kitBox.map((k) =>
        k.cor === 'Fosco' && k.tamanhoCm === 150 ? { ...k, ativo: false as const } : k,
      ),
    }
    expect(() =>
      priceBox(inactiveKit, {
        kind: 'box',
        spanCm: 140,
        glassColor: 'Incolor',
        profileColor: 'Fosco',
        markup: 0.3,
        extras: [],
      }),
    ).toThrow(/Kit Box sem preço/)
  })
})

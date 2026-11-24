import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from '../../data/seedCatalog'
import { isCatalogItemActive } from '../catalogActive'
import type { CorrerInput, ItemInput, MarginMode } from '../types'
import {
  aluminumSurcharge,
  buildBreakdown,
  ceiling,
  customerExtraSellPrice,
  findAcessorio,
  findAluminio,
  findKitBox,
  findVidro,
  MissingPriceError,
  priceBox,
  priceBoxForaPadrao,
  priceCorrer,
  priceCustom,
  priceEspelho,
  priceFixo,
  priceItem,
  priceItemPreview,
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
    expect(r.breakdown.accessories).toBeCloseTo(20, 2)
    expect(r.breakdown.totalCost).toBeCloseTo(698.10395, 2)
    expect(r.breakdown.finalPrice).toBeCloseTo(907.535135, 2)
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
    expect(r.breakdown.accessories).toBeCloseTo(20, 2)
    expect(r.breakdown.totalCost).toBeCloseTo(585.61375, 2)
    expect(r.breakdown.finalPrice).toBeCloseTo(761.297875, 2)
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
    expect(r.breakdown.finalPrice).toBeCloseTo(907.548135, 2)
  })

  it('calc_BOX laborFixed usa boxAvulso (1 un) em vez de boxPerM2', () => {
    const base = priceBox(catalog, {
      kind: 'box',
      spanCm: 140,
      glassColor: 'Incolor',
      profileColor: 'Fosco',
      markup: 0.3,
      extras: [],
    })
    const fixed = priceBox(catalog, {
      kind: 'box',
      spanCm: 140,
      glassColor: 'Incolor',
      profileColor: 'Fosco',
      laborFixed: true,
      markup: 0.3,
      extras: [],
    })
    expect(fixed.breakdown.labor).toBeCloseTo(catalog.config.labor.boxAvulso, 6)
    expect(fixed.breakdown.glass).toBeCloseTo(base.breakdown.glass, 6)
    const line = fixed.bom.find((l) => l.category === 'mao_de_obra')!
    expect(line.unit).toBe('un')
    expect(line.quantity).toBe(1)
  })

  it('calc_BOX_FORA_PADRAO = box com altura + temperado 08 + AL66/AL67 (2100 mm → 2,5 m)', () => {
    const widthMm = 1400
    const heightMm = 2100
    const glassColor = 'Incolor'
    const profileColor = 'Fosco'
    const markup = 0.3
    const tempered = findVidro(catalog, 'Temperado', glassColor, '08')
    const boxLike = {
      ...catalog,
      config: { ...catalog.config, boxDefaultHeightM: heightMm / 1000 },
      vidros: catalog.vidros.map((v) =>
        v.tipo === 'Box' && v.cor === glassColor && v.espessuraMm === '08'
          ? { ...v, valorM2: tempered.valorM2 }
          : v,
      ),
    }
    const base = priceBox(boxLike, {
      kind: 'box',
      spanCm: widthMm / 10,
      glassColor,
      profileColor,
      markup,
      extras: [],
    })
    const aluQty = ceiling(heightMm, 500) / 1000
    expect(aluQty).toBe(2.5)
    const surcharge = aluminumSurcharge(catalog.config, profileColor)
    const al66 = findAluminio(catalog, 'AL 66')
    const al67 = findAluminio(catalog, 'AL 67')
    const aluCost = (al66.valorMetro + al67.valorMetro) * aluQty * (1 + surcharge)

    const r = priceBoxForaPadrao(catalog, {
      kind: 'boxForaPadrao',
      widthMm,
      heightMm,
      glassColor,
      profileColor,
      markup,
      extras: [],
    })
    expect(r.breakdown.labor).toBeCloseTo(base.breakdown.labor, 6)
    expect(r.breakdown.glass).toBeCloseTo(base.breakdown.glass, 6)
    expect(r.breakdown.hardware).toBeCloseTo(base.breakdown.hardware, 6)
    expect(r.breakdown.accessories).toBeCloseTo(base.breakdown.accessories, 6)
    expect(r.breakdown.aluminum).toBeCloseTo(aluCost, 6)
    expect(r.breakdown.totalCost).toBeCloseTo(base.breakdown.totalCost + aluCost, 6)
    expect(r.breakdown.finalPrice).toBeCloseTo((base.breakdown.totalCost + aluCost) * (1 + markup), 6)
    expect(r.bom.filter((l) => l.code === 'AL 66' || l.code === 'AL 67')).toHaveLength(2)
    expect(r.bom.find((l) => l.category === 'vidro')!.description).toMatch(/temperado/i)
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
    // Trespasso AL 46 (2 m) no lugar de AL 15.
    expect(r.breakdown.aluminum).toBeCloseTo(121.499999986, 4)
    expect(r.breakdown.finalPrice).toBeCloseTo(621.84, 1)
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
    // Trespasso AL 46 no lugar de AL 15 (1 m): alumínio cai de 102,03 para cerca de 100,08.
    expect(r.breakdown.aluminum).toBeCloseTo(100.0833333225, 4)
    expect(r.breakdown.finalPrice).toBeCloseTo(487.98533331925, 2)
    expect(r.bom.some((l) => l.code === 'AL 46')).toBe(true)
    expect(r.bom.some((l) => l.code === 'AL 15' || l.code === 'AL 45')).toBe(false)
    expect(r.bom.find((l) => l.code === 'AL 75')?.quantity).toBe(1.5)
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
    expect(r.breakdown.finalPrice).toBeCloseTo(890.5771766539375, 2)
  })

  it('corrigir AL 67 em duas folhas e manter quatro folhas sem ele', () => {
    const quantity = (subtype: CorrerInput['subtype'], widthMm: number, heightMm: number, code: string) =>
      priceCorrer(catalog, {
        kind: 'correr',
        subtype,
        widthMm,
        heightMm,
        glassColor: 'Incolor',
        thicknessMm: '08',
        profileColor: 'Fosco',
        markup: 0.3,
        extras: [],
      }).bom.find((line) => line.code === code)?.quantity

    expect(quantity('J2F', 1200, 1000, 'AL 67')).toBe(2)
    expect(quantity('P2F', 900, 2100, 'AL 67')).toBe(4.5)
    expect(quantity('J4F', 1950, 754, 'AL 67')).toBeUndefined()
    expect(quantity('P4F', 2400, 2100, 'AL 67')).toBeUndefined()
  })

  it('calc_CORRER P1F inclui composição e permite retirar tubo 5x5', () => {
    const input: CorrerInput = {
      kind: 'correr',
      subtype: 'P1F',
      widthMm: 900,
      heightMm: 2100,
      glassColor: 'Incolor',
      thicknessMm: '08',
      profileColor: 'Fosco',
      markup: 0.3,
      extras: [],
    }
    const withTube = priceCorrer(catalog, input)
    const withoutTube = priceCorrer(catalog, { ...input, hasTube5x5: false })
    const quantities = Object.fromEntries(withTube.bom.map((line) => [line.code, line.quantity]))

    expect(quantities).toMatchObject({
      'AL 49': 2,
      'AL 50': 2,
      'AL 75': 1,
      'AL 43': 1,
      'AL 67': 2.5,
      'TUBO 5X5': 2.5,
      'KIT 10': 1,
      ESCOVA: 2,
      '1406': 2,
      '1125': 2,
      'SILICONE ACT': 1,
    })
    expect(withTube.bom.find((line) => line.category === 'vidro')?.quantity).toBe(2.043)
    expect(quantities['AL 66']).toBeUndefined()
    expect(quantities['AL 15']).toBeUndefined()
    expect(quantities['AL 46']).toBeUndefined()
    expect(withoutTube.bom.find((line) => line.code === 'TUBO 5X5')).toBeUndefined()
  })

  it('6 mm usa o jogo de 8 mm e 10 mm troca o código sem mudar a metragem', () => {
    const sixMmCodes = ['AL 90', 'AL 91', 'AL 92', 'AL 93', 'AL 94', 'AL 95', 'AL 96', 'AL 45']
    const lines = (subtype: CorrerInput['subtype'], thicknessMm: string, widthMm: number, heightMm: number) =>
      priceCorrer(catalog, {
        kind: 'correr',
        subtype,
        widthMm,
        heightMm,
        glassColor: 'Incolor',
        thicknessMm,
        profileColor: 'Fosco',
        markup: 0.3,
        extras: [],
      }).bom.filter((line) => line.category === 'aluminio')

    const sig = (rows: { code: string; quantity: number }[]) =>
      rows.map((line) => `${line.code}:${line.quantity}`).join('|')

    const j2f08 = lines('J2F', '08', 1200, 1000)
    const j2f06 = lines('J2F', '06', 1200, 1000)
    expect(sig(j2f06)).toBe(sig(j2f08))
    expect(j2f08.map((line) => line.code)).toEqual(['AL 49', 'AL 50', 'AL 75', 'AL 43', 'AL 66', 'AL 67', 'AL 46'])
    for (const code of sixMmCodes) {
      expect(j2f06.some((line) => line.code === code)).toBe(false)
      expect(j2f08.some((line) => line.code === code)).toBe(false)
    }

    const j2f10 = lines('J2F', '10', 1200, 1000)
    expect(j2f10.map((line) => line.code)).toEqual(['AL 51', 'AL 52', 'AL 05', 'AL 13', 'AL 67', 'AL 15'])
    expect(j2f10.find((line) => line.code === 'AL 67')?.quantity).toBe(4)
    expect(j2f08.find((line) => line.code === 'AL 66')!.quantity + j2f08.find((line) => line.code === 'AL 67')!.quantity).toBe(4)
    expect(j2f10.find((line) => line.code === 'AL 51')?.quantity).toBe(j2f08.find((line) => line.code === 'AL 49')?.quantity)
    expect(j2f10.find((line) => line.code === 'AL 05')?.quantity).toBe(j2f08.find((line) => line.code === 'AL 75')?.quantity)
    expect(j2f10.find((line) => line.code === 'AL 15')?.quantity).toBe(j2f08.find((line) => line.code === 'AL 46')?.quantity)

    const j4f10 = lines('J4F', '10', 1950, 754)
    const j4f08 = lines('J4F', '08', 1950, 754)
    expect(j4f10.map((line) => line.code)).toEqual(['AL 51', 'AL 52', 'AL 05', 'AL 13', 'AL 67', 'AL 15', 'AL 17'])
    expect(j4f08.map((line) => line.code)).toEqual(['AL 49', 'AL 50', 'AL 75', 'AL 43', 'AL 66', 'AL 46', 'AL 47'])
    expect(j4f10.find((line) => line.code === 'AL 67')?.quantity).toBe(j4f08.find((line) => line.code === 'AL 66')?.quantity)
    expect(j4f08.some((line) => line.code === 'AL 67')).toBe(false)
    expect(j4f10.filter((line) => line.code === 'AL 67')).toHaveLength(1)

    const p1f10 = lines('P1F', '10', 900, 2100)
    expect(Object.fromEntries(p1f10.map((line) => [line.code, line.quantity]))).toMatchObject({
      'AL 51': 2,
      'AL 52': 2,
      'AL 05': 1,
      'AL 13': 1,
      'AL 67': 2.5,
      'TUBO 5X5': 2.5,
    })
    expect(p1f10.some((line) => line.code === 'AL 66' || line.code === 'AL 15' || line.code === 'AL 17')).toBe(false)
  })

  it('6 mm desmarcado troca o código e mantém AL 67; 8 mm, 10 mm, box e pivotante não mudam', () => {
    const sixMm = ['AL 90', 'AL 91', 'AL 92', 'AL 93', 'AL 94', 'AL 95', 'AL 96']
    const priced = {
      ...catalog,
      aluminios: catalog.aluminios.map((row) =>
        sixMm.includes(row.codigo) ? { ...row, valorBarra: 60 } : row,
      ),
    }
    const off = { use8mmAluminumOn6mmGlass: false as const }
    const pair: Record<string, string> = {
      'AL 49': 'AL 90',
      'AL 50': 'AL 91',
      'AL 75': 'AL 92',
      'AL 43': 'AL 93',
      'AL 66': 'AL 96',
      'AL 67': 'AL 67',
      'AL 46': 'AL 95',
      'AL 47': 'AL 94',
    }
    const aluminum = (use8mm: boolean, subtype: CorrerInput['subtype'], widthMm: number, heightMm: number, thicknessMm: string) =>
      priceCorrer(
        priced,
        {
          kind: 'correr',
          subtype,
          widthMm,
          heightMm,
          glassColor: 'Incolor',
          thicknessMm,
          profileColor: 'Fosco',
          markup: 0.3,
          extras: [],
        },
        use8mm,
      ).bom
        .filter((line) => line.category === 'aluminio')
        .map((line) => `${line.code}:${line.quantity}`)

    for (const [subtype, widthMm, heightMm] of [
      ['J2F', 1200, 1000],
      ['J4F', 1950, 754],
      ['P1F', 900, 2100],
      ['P2F', 900, 2100],
      ['P4F', 1200, 2100],
    ] as const) {
      const eight = aluminum(true, subtype, widthMm, heightMm, '08')
      const six = aluminum(false, subtype, widthMm, heightMm, '06')
      expect(six).toEqual(eight.map((row) => {
        const [code, qty] = row.split(':')
        return `${pair[code] ?? code}:${qty}`
      }))
      expect(aluminum(true, subtype, widthMm, heightMm, '10')).toEqual(aluminum(false, subtype, widthMm, heightMm, '10'))
    }

    const j2f = aluminum(false, 'J2F', 1200, 1000, '06')
    expect(j2f.some((row) => row.startsWith('AL 67:'))).toBe(true)
    expect(j2f.some((row) => row.startsWith('AL 94:'))).toBe(false)
    const j4f = aluminum(false, 'J4F', 1950, 754, '06')
    expect(j4f.some((row) => row.startsWith('AL 67:'))).toBe(false)
    expect(j4f.some((row) => row.startsWith('AL 94:'))).toBe(true)
    const p1f = aluminum(false, 'P1F', 900, 2100, '06')
    expect(p1f.some((row) => row.startsWith('AL 96:'))).toBe(false)
    expect(p1f.some((row) => row.startsWith('AL 67:'))).toBe(true)

    const fixoCodes = (thicknessMm: string, use8mm: boolean) =>
      priceFixo(
        priced,
        { kind: 'fixo', widthMm: 1200, heightMm: 1500, glassColor: 'Incolor', thicknessMm, markup: 0.3, extras: [] },
        use8mm,
      ).bom
        .filter((line) => line.category === 'aluminio')
        .map((line) => `${line.code}:${line.quantity}`)
    const fixo08 = fixoCodes('08', true)
    expect(fixoCodes('06', true)).toEqual(fixo08)
    expect(fixoCodes('06', false).map((row) => row.split(':')[0])).toEqual(['AL 96'])
    expect(fixoCodes('06', false).map((row) => row.split(':')[1])).toEqual(fixo08.map((row) => row.split(':')[1]))
    expect(fixoCodes('08', false)).toEqual(fixo08)
    expect(fixoCodes('10', false)).toEqual(fixoCodes('10', true))

    const sixInput: ItemInput = {
      kind: 'correr',
      subtype: 'J2F',
      widthMm: 1200,
      heightMm: 1000,
      glassColor: 'Incolor',
      thicknessMm: '06',
      profileColor: 'Fosco',
      markup: 0.3,
      extras: [],
    }
    expect(priceItem(catalog, sixInput).breakdown.use8mmAluminumOn6mmGlass).toBe(true)
    expect(priceItem(priced, sixInput, 'empresa', off).breakdown.use8mmAluminumOn6mmGlass).toBe(false)
    expect(priceItem(catalog, { ...sixInput, thicknessMm: '08' }).breakdown.use8mmAluminumOn6mmGlass).toBeUndefined()

    const box = priceItem(
      catalog,
      { kind: 'box', spanCm: 140, glassColor: 'Incolor', profileColor: 'Fosco', markup: 0.3, extras: [] },
      'empresa',
      off,
    )
    expect(box.bom.some((line) => sixMm.includes(line.code))).toBe(false)
    expect(box.breakdown.use8mmAluminumOn6mmGlass).toBeUndefined()

    const pivot = (options?: { use8mmAluminumOn6mmGlass: boolean }) =>
      priceItem(
        catalog,
        {
          kind: 'pivotante',
          widthMm: 800,
          heightMm: 2100,
          glassColor: 'Incolor',
          thicknessMm: '06',
          profileColor: 'Fosco',
          hasLatch: true,
          markup: 0.3,
          extras: [],
        },
        'empresa',
        options,
      ).bom.map((line) => `${line.code}:${line.quantity}`)
    expect(pivot(off)).toEqual(pivot())
  })

  it('preço abaixo de R$ 0,01 é falta de preço; R$ 0,01 libera', () => {
    const glass = catalog.vidros.find(
      (row) => row.tipo === 'Temperado' && row.cor === 'Incolor' && row.espessuraMm === '08',
    )!
    const aluminum = catalog.aluminios.find((row) => row.codigo === 'AL 66')!
    const silicone = catalog.acessorios.find((row) => row.codigo === 'SILICONE ACT')!
    const input: ItemInput = {
      kind: 'fixo',
      widthMm: 1200,
      heightMm: 1500,
      glassColor: 'Incolor',
      thicknessMm: '08',
      markup: 0.3,
      extras: [],
    }
    const withGlass = (valorM2: number | null) => ({
      ...catalog,
      vidros: catalog.vidros.map((row) => (row.id === glass.id ? { ...row, valorM2 } : row)),
    })
    const withBar = (valorBarra: number) => ({
      ...catalog,
      aluminios: catalog.aluminios.map((row) => (row.id === aluminum.id ? { ...row, valorBarra } : row)),
    })
    const withSilicone = (valor: number) => ({
      ...catalog,
      acessorios: catalog.acessorios.map((row) => (row.id === silicone.id ? { ...row, valor } : row)),
    })

    for (const valor of [0, 0.009]) {
      expect(() => priceItem(withBar(valor), input)).toThrow(MissingPriceError)
      try {
        priceItem(withBar(valor), input)
      } catch (e) {
        const err = e as MissingPriceError
        expect(err.headline).toBe('Alumínio sem preço cadastrado!')
        expect(err.canPrice).toBe(true)
        expect(err.code).toBe('AL 66')
        expect(err.unit).toBe('R$/barra')
      }
      expect(() => priceItem(withGlass(valor), input)).toThrow(MissingPriceError)
      expect(() => priceItem(withSilicone(valor), input)).toThrow(MissingPriceError)
    }

    expect(priceItem(withBar(0.01), input).bom.some((line) => line.code === 'AL 66')).toBe(true)
    expect(priceItem(withGlass(0.01), input).breakdown.glass).toBeGreaterThan(0)
    expect(priceItem(withSilicone(0.01), input).breakdown.accessories).toBeGreaterThan(0)

    const zeroBar = withBar(0)
    const preview = priceItemPreview(zeroBar, input)
    expect(preview.missing?.code).toBe('AL 66')
    expect(preview.missing?.headline).toBe('Alumínio sem preço cadastrado!')
    expect(preview.zeroed.has('aluminum')).toBe(true)
    expect(preview.result.breakdown.aluminum).toBe(0)
    expect(preview.result.breakdown.labor).toBeCloseTo(priceItem(catalog, input).breakdown.labor, 2)
    expect(() => priceItem(zeroBar, input)).toThrow(MissingPriceError)

    const top = catalog.aluminios.find((row) => row.codigo === 'AL 49')!
    const cover = catalog.aluminios.find((row) => row.codigo === 'AL 50')!
    const correr: ItemInput = {
      kind: 'correr',
      subtype: 'J2F',
      widthMm: 1200,
      heightMm: 1000,
      glassColor: 'Incolor',
      thicknessMm: '08',
      profileColor: 'Fosco',
      markup: 0.3,
      extras: [],
    }
    const bars = (prices: Record<number, number>) => ({
      ...catalog,
      aluminios: catalog.aluminios.map((row) =>
        prices[row.id] == null ? row : { ...row, valorBarra: prices[row.id] },
      ),
    })
    expect(priceItemPreview(bars({ [top.id]: 0, [cover.id]: 0 }), correr).missing?.code).toBe('AL 49')
    expect(priceItemPreview(bars({ [top.id]: 0.01, [cover.id]: 0 }), correr).missing?.code).toBe('AL 50')
    expect(priceItemPreview(bars({ [top.id]: 0.01, [cover.id]: 0.01 }), correr).missing).toBeNull()
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

  it('calc_PIVOTANTE 800x2100 Incolor 08 Fosco without door aluminum', () => {
    const base = {
      kind: 'pivotante' as const,
      widthMm: 800,
      heightMm: 2100,
      glassColor: 'Incolor',
      thicknessMm: '08',
      profileColor: 'Fosco',
      hasLatch: false,
      markup: 0.3,
      extras: [],
    }
    const legacy = pricePivotante(catalog, base)
    const withAluminum = pricePivotante(catalog, { ...base, hasAluminum: true })
    const r = pricePivotante(catalog, { ...base, hasAluminum: false })

    expect(legacy.breakdown).toEqual(withAluminum.breakdown)
    expect(withAluminum.breakdown.aluminum).toBeGreaterThan(0)
    expect(r.breakdown.aluminum).toBe(0)
    expect(r.bom.some((l) => l.category === 'aluminio')).toBe(false)
    expect(r.breakdown.glass).toBeCloseTo(withAluminum.breakdown.glass, 6)
    expect(r.breakdown.hardware).toBeCloseTo(withAluminum.breakdown.hardware, 6)
    expect(r.breakdown.labor).toBeCloseTo(withAluminum.breakdown.labor, 6)
    expect(r.breakdown.finalPrice).toBeCloseTo(
      withAluminum.breakdown.finalPrice - withAluminum.breakdown.aluminum * 1.3,
      6,
    )
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
    const al66 = catalog.aluminios.find((a) => a.codigo === 'AL 66')
    expect(al66?.valorMetro).toBeGreaterThan(0)
    // 2×400 + 2×400 = 1600 mm, sobe para 2000 mm = 2 m
    expect(r.bom.find((l) => l.code === 'AL 66')?.quantity).toBe(2)
    expect(r.breakdown.aluminum).toBeCloseTo(al66!.valorMetro * 2, 4)
    expect(r.breakdown.finalPrice).toBeCloseTo((34.875 + 9 + 20 + al66!.valorMetro * 2) * 1.3, 3)
    expect((r.notes ?? []).some((n) => n.includes('0,25'))).toBe(true)
  })

  it('vidro fixo 06 e 08 leva AL 66 no perímetro e 10 mm leva AL 67', () => {
    const base = {
      kind: 'fixo' as const,
      widthMm: 1000,
      heightMm: 1200,
      glassColor: 'Incolor',
      markup: 0.3,
      extras: [],
    }
    const mm08 = priceFixo(catalog, { ...base, thicknessMm: '08' })
    const mm06 = priceFixo(catalog, { ...base, thicknessMm: '06' })
    const mm10 = priceFixo(catalog, { ...base, thicknessMm: '10' })
    const al67 = catalog.aluminios.find((a) => a.codigo === 'AL 67')
    // 2×1000 + 2×1200 = 4400 mm, sobe para 4500 mm = 4,5 m
    expect(mm08.bom.find((l) => l.code === 'AL 66')?.quantity).toBe(4.5)
    expect(mm06.bom.find((l) => l.code === 'AL 66')?.quantity).toBe(4.5)
    expect(mm08.breakdown.aluminum).toBeCloseTo(mm06.breakdown.aluminum, 4)
    expect(mm10.bom.find((l) => l.code === 'AL 67')?.quantity).toBe(4.5)
    expect(mm10.bom.some((l) => l.code === 'AL 66')).toBe(false)
    expect(mm10.breakdown.aluminum).toBeCloseTo(al67!.valorMetro * 4.5, 4)
    expect(mm10.bom.find((l) => l.code === 'AL 67')?.surcharge).toBeUndefined()
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
    const al67 = catalog.aluminios.find((a) => a.codigo === 'AL 67')
    // 2×1200 + 2×1500 = 5400 mm, sobe para 5500 mm = 5,5 m de AL 67
    expect(r.bom.find((l) => l.code === 'AL 67')?.quantity).toBe(5.5)
    expect(r.breakdown.aluminum).toBeCloseTo(al67!.valorMetro * 5.5, 4)
    expect(r.breakdown.glass).toBeCloseTo(482.76, 2)
    expect(r.breakdown.labor).toBeCloseTo(81, 1)
    expect(r.breakdown.accessories).toBeCloseTo(40, 2)
    expect(r.breakdown.finalPrice).toBeCloseTo((482.76 + 81 + 40 + al67!.valorMetro * 5.5) * 1.3, 2)
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

  it('names the catalog row when the glass price is empty', () => {
    const row = catalog.vidros.find((v) => isCatalogItemActive(v) && v.valorM2 != null)
    expect(row).toBeTruthy()
    const next = {
      ...catalog,
      vidros: catalog.vidros.map((v) => (v.id === row!.id ? { ...v, valorM2: null } : v)),
    }
    try {
      findVidro(next, row!.tipo, row!.cor, row!.espessuraMm)
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(MissingPriceError)
      const err = e as MissingPriceError
      expect(err.id).toBe(row!.id)
      expect(err.canPrice).toBe(true)
      expect(err.table).toBe('vidros')
      expect(err.headline).toBe('Vidro sem preço cadastrado!')
      expect(err.code).toBe(row!.codigo)
      expect(err.message).toMatch(/Vidro sem preço/)
    }
  })

  it('preview keeps the other costs and zeroes the glass line when its price is empty', () => {
    const input: ItemInput = {
      kind: 'fixo',
      widthMm: 400,
      heightMm: 400,
      glassColor: 'Incolor',
      thicknessMm: '08',
      markup: 0.3,
      extras: [],
    }
    const full = priceItem(catalog, input)
    const row = catalog.vidros.find(
      (v) => v.tipo === 'Temperado' && v.cor === 'Incolor' && v.espessuraMm === '08',
    )
    expect(row?.valorM2).not.toBeNull()
    const next = {
      ...catalog,
      vidros: catalog.vidros.map((v) => (v.id === row!.id ? { ...v, valorM2: null } : v)),
    }
    expect(() => priceItem(next, input)).toThrow(MissingPriceError)
    const preview = priceItemPreview(next, input)
    expect(preview.missing?.table).toBe('vidros')
    expect(preview.zeroed.has('glass')).toBe(true)
    expect(preview.result.breakdown.glass).toBe(0)
    expect(preview.result.breakdown.labor).toBeCloseTo(full.breakdown.labor, 2)
    expect(preview.result.breakdown.accessories).toBeCloseTo(full.breakdown.accessories, 2)
  })

  it('names a missing accessory without a price field', () => {
    try {
      findAcessorio(catalog, 'NAO-EXISTE')
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(MissingPriceError)
      const err = e as MissingPriceError
      expect(err.canPrice).toBe(false)
      expect(err.table).toBe('acessorios')
      expect(err.headline).toBe('Acessório não cadastrado!')
      expect(err.message).toMatch(/Acessório não encontrado/)
    }
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

describe('cálculo de margem', () => {
  const parts = {
    labor: 50,
    glass: 100,
    aluminum: 0,
    hardware: 0,
    accessories: 0,
    extras: 10,
    markup: 0.3,
  }

  it.each([
    ['empresa', 208, 48],
    ['vendedor', 193, 33],
    ['autonomo', 160, 0],
  ] as const)('%s: preço %d, margem %d', (mode, finalPrice, marginAmount) => {
    const b = buildBreakdown(parts, mode)
    expect(b.totalCost).toBeCloseTo(160, 10)
    expect(b.finalPrice).toBeCloseTo(finalPrice, 10)
    expect(b.marginAmount).toBeCloseTo(marginAmount, 10)
    expect(b.marginPct).toBeCloseTo(marginAmount / finalPrice, 10)
    expect(b.markup).toBe(0.3)
    expect(b.marginMode).toBe(mode)
  })

  it('sem modo é empresa', () => {
    expect(buildBreakdown(parts)).toEqual(buildBreakdown(parts, 'empresa'))
  })

  it('adicional na proposta: venda com margem (não custo)', () => {
    expect(customerExtraSellPrice(37, 0.3, 'empresa')).toBe(48.1)
    expect(customerExtraSellPrice(73, 0.3, 'vendedor')).toBe(94.9)
    expect(customerExtraSellPrice(73, 0.3, 'autonomo')).toBe(73)
    expect(customerExtraSellPrice(50, 0.3)).toBe(65)
  })

  it('modo muda só preço e margem; BOM e custos iguais', () => {
    const input: CorrerInput = {
      kind: 'correr',
      subtype: 'J4F',
      widthMm: 1950,
      heightMm: 754,
      glassColor: 'Verde',
      thicknessMm: '06',
      profileColor: 'Fosco',
      markup: 0.3,
      extras: [{ id: 'e1', description: 'Adicional de altura', amount: 25 }],
    }
    const legacy = priceCorrer(catalog, input)
    const byMode = Object.fromEntries(
      (['empresa', 'vendedor', 'autonomo'] as MarginMode[]).map((m) => [m, priceItem(catalog, input, m)]),
    )
    expect(byMode.empresa.breakdown.finalPrice).toBeCloseTo(legacy.breakdown.finalPrice, 10)
    for (const r of Object.values(byMode)) {
      expect(r.bom).toEqual(legacy.bom)
      for (const key of ['labor', 'glass', 'aluminum', 'hardware', 'accessories', 'extras', 'totalCost'] as const) {
        expect(r.breakdown[key]).toBeCloseTo(legacy.breakdown[key], 10)
      }
    }
    const b = legacy.breakdown
    const material = b.glass + b.aluminum + b.hardware + b.accessories
    expect(byMode.vendedor.breakdown.finalPrice).toBeCloseTo((material + b.extras) * 1.3 + b.labor, 10)
    expect(byMode.autonomo.breakdown.finalPrice).toBeCloseTo(b.totalCost, 10)
  })

  it('item avulso ignora o modo', () => {
    const input = { kind: 'custom', description: 'Película', amount: 80 } as const
    for (const mode of ['empresa', 'vendedor', 'autonomo'] as const) {
      expect(priceItem(catalog, input, mode).breakdown.finalPrice).toBe(80)
    }
  })
})

describe('taxa de mão de obra do item', () => {
  it('substitui só a taxa do tipo do item; materiais iguais', () => {
    const inputs: Exclude<ItemInput, { kind: 'custom' }>[] = [
      { kind: 'box', spanCm: 120, glassColor: 'Incolor', profileColor: 'Fosco', markup: 0.3, extras: [] },
      {
        kind: 'maxiar', widthMm: 600, heightMm: 400, glassColor: 'Incolor', thicknessMm: '08', profileColor: 'Fosco', markup: 0.3, extras: [],
      },
    ]
    for (const input of inputs) {
      const base = priceItem(catalog, input)
      const own = priceItem(catalog, { ...input, laborRate: 10 })
      const line = own.bom.find((l) => l.category === 'mao_de_obra')!
      expect(line.unitPrice).toBe(10)
      expect(own.breakdown.labor).toBeCloseTo(line.quantity * 10, 6)
      expect(own.breakdown.glass).toBe(base.breakdown.glass)
      expect(own.breakdown.aluminum).toBe(base.breakdown.aluminum)
    }
  })
})

describe('composição do custo (BOM)', () => {
  const refs: ItemInput[] = [
    { kind: 'box', spanCm: 140, glassColor: 'Incolor', profileColor: 'Fosco', markup: 0.3, extras: [] },
    { kind: 'box', spanCm: 120, glassColor: 'Incolor', profileColor: 'Fosco', markup: 0.3, extras: [] },
    { kind: 'box', spanCm: 140, glassColor: 'Incolor', profileColor: 'Preto', markup: 0.3, extras: [] },
    {
      kind: 'boxForaPadrao',
      widthMm: 1400,
      heightMm: 2100,
      glassColor: 'Incolor',
      profileColor: 'Fosco',
      markup: 0.3,
      extras: [],
    },
    { kind: 'correr', subtype: 'J4F', widthMm: 1950, heightMm: 754, glassColor: 'Verde', thicknessMm: '06', profileColor: 'Fosco', markup: 0.3, extras: [] },
    { kind: 'correr', subtype: 'J2F', widthMm: 1200, heightMm: 1000, glassColor: 'Incolor', thicknessMm: '08', profileColor: 'Fosco', markup: 0.3, extras: [] },
    { kind: 'correr', subtype: 'P2F', widthMm: 900, heightMm: 2100, glassColor: 'Fume', thicknessMm: '08', profileColor: 'Branco', markup: 0.3, extras: [] },
    { kind: 'correr', subtype: 'P4F', widthMm: 2400, heightMm: 2100, glassColor: 'Incolor', thicknessMm: '08', profileColor: 'Preto', markup: 0.3, extras: [] },
    { kind: 'pivotante', widthMm: 795, heightMm: 2168, glassColor: 'Incolor', thicknessMm: '08', profileColor: 'Fosco', hasLatch: true, markup: 0.3, extras: [] },
    { kind: 'pivotante', widthMm: 800, heightMm: 2100, glassColor: 'Incolor', thicknessMm: '08', profileColor: 'Preto', hasLatch: false, markup: 0.3, extras: [] },
    { kind: 'maxiar', widthMm: 540, heightMm: 640, glassColor: 'Incolor', thicknessMm: '08', profileColor: 'Branco', markup: 0.3, extras: [] },
    { kind: 'fixo', widthMm: 300, heightMm: 400, glassColor: 'Incolor', thicknessMm: '08', markup: 0.3, extras: [] },
    { kind: 'espelho', finish: 'Espelho Lapidado', widthMm: 1000, heightMm: 800, glassColor: 'Prata', thicknessMm: '04', markup: 0.3, extras: [] },
  ]
  const cents = (n: number) => Math.round(n * 100)
  const groups = [
    ['vidro', 'glass'],
    ['aluminio', 'aluminum'],
    ['ferragem', 'hardware'],
    ['acessorio', 'accessories'],
    ['mao_de_obra', 'labor'],
  ] as const

  it.each(refs.map((r) => [`${r.kind} ${'subtype' in r ? r.subtype : ''} ${'profileColor' in r ? r.profileColor : ''}`, r] as const))(
    '%s: linhas somam o custo de cada grupo',
    (_name, input) => {
      const { bom, breakdown } = priceItem(catalog, input)
      for (const [category, field] of groups) {
        const sum = bom.filter((l) => l.category === category).reduce((s, l) => s + l.total, 0)
        expect(cents(sum), category).toBe(cents(breakdown[field]))
      }
      expect(bom.filter((l) => l.category === 'mao_de_obra')).toHaveLength(1)
      for (const line of bom) {
        expect(line.unit, line.code).toBeDefined()
        expect(cents(line.quantity * line.unitPrice), line.code).toBe(cents(line.total))
        if (line.category !== 'mao_de_obra') expect(line.source, line.code).toBeDefined()
      }
    },
  )

  it('cor com acréscimo entra no preço unitário de alumínio e ferragem', () => {
    const surcharge = catalog.config.aluminumColors.find((c) => c.color === 'Branco')!.surcharge
    expect(surcharge).toBeGreaterThan(0)
    const input = refs.find((r) => r.kind === 'correr' && r.profileColor === 'Branco') as CorrerInput
    const base = priceItem(catalog, { ...input, profileColor: 'Fosco' }).bom
    const colored = priceItem(catalog, input).bom
    for (const line of colored.filter((l) => l.category === 'aluminio' || l.category === 'ferragem')) {
      const plain = base.find((l) => l.code === line.code)!
      expect(line.surcharge).toBe(surcharge)
      expect(line.unitPrice).toBeCloseTo(plain.unitPrice * (1 + surcharge), 10)
    }
    expect(colored.find((l) => l.category === 'vidro')!.surcharge).toBeUndefined()
  })

  it('box: vidro em m² (quantidade × unitário = total)', () => {
    const glass = priceItem(catalog, refs[0]).bom.find((l) => l.category === 'vidro')!
    expect(glass.unit).toBe('m2')
    expect(glass.quantity * glass.unitPrice).toBeCloseTo(glass.total, 10)
  })
})

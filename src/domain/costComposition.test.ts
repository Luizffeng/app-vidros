import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from '../data/seedCatalog'
import { composeCost } from './costComposition'
import { addItem, createEmptyDraft, emitQuote, setCustomer } from './quote'
import type { Catalog, CorrerInput, Quote } from './types'

const catalog = loadSeedCatalog()

const correr: CorrerInput = {
  kind: 'correr',
  subtype: 'J2F',
  widthMm: 1200,
  heightMm: 1000,
  glassColor: 'Incolor',
  thicknessMm: '08',
  profileColor: 'Branco',
  markup: 0.3,
  extras: [],
}

function draftWith(cat: Catalog = catalog): Quote {
  return addItem(createEmptyDraft('ORC-2026-0020', cat.config.version), cat, correr)
}

describe('composeCost', () => {
  it('grupos em ordem, com totais que somam o custo', () => {
    const quote = draftWith()
    const { groups, totalCost } = composeCost(quote.items[0], quote, catalog, { isAdmin: true })
    expect(groups.map((g) => g.label)).toEqual(['Vidro', 'Alumínio', 'Ferragem', 'Acessório', 'Mão de obra'])
    const sum = groups.reduce((s, g) => s + g.total, 0)
    expect(sum).toBeCloseTo(totalCost - quote.items[0].result.breakdown.extras, 6)
  })

  it('admin em rascunho edita todas as linhas, inclusive a taxa de mão de obra', () => {
    const quote = draftWith()
    const { groups } = composeCost(quote.items[0], quote, catalog, { isAdmin: true })
    const lines = groups.flatMap((g) => g.lines)
    expect(lines.every((l) => l.editable)).toBe(true)
    expect(lines.find((l) => l.category === 'mao_de_obra')).toMatchObject({
      laborKey: 'temperedPerM2',
      editPrice: catalog.config.labor.temperedPerM2,
      overridden: false,
    })
  })

  it('taxa de mão de obra deste item', () => {
    const base = draftWith()
    const quote = addItem(createEmptyDraft('ORC-2026-0021', catalog.config.version), catalog, { ...correr, laborRate: 70 })
    const labor = composeCost(quote.items[0], quote, catalog, { isAdmin: true }).groups.find(
      (g) => g.category === 'mao_de_obra',
    )!.lines[0]
    expect(labor).toMatchObject({ overridden: true, editPrice: 70, unitPrice: 70 })
    expect(quote.items[0].result.breakdown.labor).toBeGreaterThan(base.items[0].result.breakdown.labor)
  })

  it('item avulso: só resumo', () => {
    const quote = addItem(createEmptyDraft('ORC-2026-0022', catalog.config.version), catalog, {
      kind: 'custom',
      description: 'Película',
      amount: 50,
    })
    expect(composeCost(quote.items[0], quote, catalog, { isAdmin: true }).groups).toEqual([])
  })

  it('preço base sem acréscimo de cor; alumínio edita pela barra', () => {
    const quote = draftWith()
    const alu = composeCost(quote.items[0], quote, catalog, { isAdmin: true }).groups.find(
      (g) => g.category === 'aluminio',
    )!.lines[0]
    const row = catalog.aluminios.find((a) => a.id === alu.source!.id)!
    expect(alu.surcharge).toBeGreaterThan(0)
    expect(alu.basePrice).toBeCloseTo(row.valorMetro, 10)
    expect(alu.editPrice).toBe(row.valorBarra)
    expect(alu.barLength).toBe(row.metragemBarra)
  })

  it('vendedor e emitido: somente leitura', () => {
    const quote = draftWith()
    const asSeller = composeCost(quote.items[0], quote, catalog, { isAdmin: false }).groups.flatMap((g) => g.lines)
    expect(asSeller.every((l) => l.blockedReason === 'readonly')).toBe(true)
    const emitted = emitQuote(setCustomer(quote, { name: 'Ana' }))
    const lines = composeCost(emitted.items[0], emitted, catalog, { isAdmin: true }).groups.flatMap((g) => g.lines)
    expect(lines.some((l) => l.editable)).toBe(false)
  })

  it('item antigo (sem unidade/origem) e código desativado', () => {
    const quote = draftWith()
    const old: Quote = {
      ...quote,
      items: quote.items.map((i) => ({
        ...i,
        result: { ...i.result, bom: i.result.bom.map(({ unit: _u, source: _s, ...l }) => l) },
      })),
    }
    const oldLines = composeCost(old.items[0], old, catalog, { isAdmin: true }).groups.flatMap((g) => g.lines)
    expect(oldLines.filter((l) => l.category !== 'mao_de_obra').every((l) => l.blockedReason === 'old-item')).toBe(true)

    const glass = quote.items[0].result.bom.find((l) => l.category === 'vidro')!
    const inactive: Catalog = {
      ...catalog,
      vidros: catalog.vidros.map((v) => (v.id === glass.source!.id ? { ...v, ativo: false } : v)),
    }
    const line = composeCost(quote.items[0], quote, inactive, { isAdmin: true }).groups[0].lines[0]
    expect(line).toMatchObject({ editable: false, blockedReason: 'inactive' })
  })

  it('marca preço deste orçamento e usa ele para editar', () => {
    const quote = draftWith()
    const glass = quote.items[0].result.bom.find((l) => l.category === 'vidro')!
    const withOverride: Quote = { ...quote, priceOverrides: [{ ref: glass.source!, price: 123 }] }
    const line = composeCost(withOverride.items[0], withOverride, catalog, { isAdmin: true }).groups[0].lines[0]
    expect(line.overridden).toBe(true)
    expect(line.editPrice).toBe(123)
  })

  it('marca linhas cujo preço mudou no catálogo depois do item', () => {
    const quote = draftWith()
    const alu = quote.items[0].result.bom.find((l) => l.category === 'aluminio')!
    const changed: Catalog = {
      ...catalog,
      aluminios: catalog.aluminios.map((a) => (a.id === alu.source!.id ? { ...a, valorBarra: 600, valorMetro: 100 } : a)),
      config: { ...catalog.config, labor: { ...catalog.config.labor, temperedPerM2: 99 } },
    }
    const lines = composeCost(quote.items[0], quote, changed, { isAdmin: false }).groups.flatMap((g) => g.lines)
    const flagged = lines.filter((l) => l.catalogNow != null)
    expect(flagged.map((l) => l.code)).toEqual([alu.code, ''])
    expect(flagged[0].catalogNow).toBeCloseTo(100 * (1 + alu.surcharge!), 6)
    expect(flagged[1]).toMatchObject({ category: 'mao_de_obra', catalogNow: 99 })
    expect(composeCost(quote.items[0], quote, catalog, { isAdmin: true }).groups.flatMap((g) => g.lines).some((l) => l.catalogNow != null)).toBe(false)
    const emitted = emitQuote(setCustomer(quote, { name: 'Ana' }))
    expect(composeCost(emitted.items[0], emitted, changed, { isAdmin: true }).groups.flatMap((g) => g.lines).some((l) => l.catalogNow != null)).toBe(false)
  })
})

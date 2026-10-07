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

  it('admin em rascunho edita linhas do catálogo; mão de obra nunca', () => {
    const quote = draftWith()
    const { groups } = composeCost(quote.items[0], quote, catalog, { isAdmin: true })
    const lines = groups.flatMap((g) => g.lines)
    expect(lines.filter((l) => l.category !== 'mao_de_obra').every((l) => l.editable)).toBe(true)
    expect(lines.find((l) => l.category === 'mao_de_obra')).toMatchObject({ editable: false, blockedReason: 'labor' })
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
    expect(asSeller.filter((l) => l.category !== 'mao_de_obra').every((l) => l.blockedReason === 'readonly')).toBe(true)
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
})

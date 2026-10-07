import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from '../data/seedCatalog'
import type { Catalog, EspelhoInput, MarginMode, Quote } from './types'
import {
  addItem,
  catalogVersionDate,
  createEmptyDraft,
  createRevision,
  displayQuoteNumber,
  draftOutdated,
  dropEmptyFreight,
  emitQuote,
  formatDisplayQuoteCode,
  normalizeQuote,
  outdatedSince,
  quotePdfFilename,
  quoteShareText,
  repriceDraft,
  resolveQuoteValidUntil,
  setAdditionalCosts,
  setCustomer,
  setDiscounts,
} from './quote'

const catalog = loadSeedCatalog()

function sampleQuote() {
  let quote = createEmptyDraft('ORC-2026-0001', catalog.config.version)
  quote = setCustomer(quote, { name: 'Maria' })
  quote = addItem(quote, catalog, {
    kind: 'espelho',
    finish: 'Espelho Lapidado',
    widthMm: 3445,
    heightMm: 745,
    glassColor: 'Prata',
    thicknessMm: '04',
    markup: 0.3,
    extras: [{ id: 'x1', description: 'Instalação', amount: 50 }],
  })
  quote = addItem(quote, catalog, {
    kind: 'correr',
    subtype: 'J2F',
    widthMm: 1500,
    heightMm: 1200,
    glassColor: 'Incolor',
    thicknessMm: '08',
    profileColor: 'Fosco',
    markup: 0.3,
    extras: [],
  })
  quote = addItem(quote, catalog, { kind: 'custom', description: '', amount: 80 })
  return quote
}

describe('custos adicionais', () => {
  it('rascunho novo começa sem custos', () => {
    expect(createEmptyDraft('ORC-2026-0001', catalog.config.version).additionalCosts).toEqual([])
  })

  it('remove só o Frete automático em R$ 0', () => {
    const costs = [
      { id: 'a', label: 'Frete', amount: 0 },
      { id: 'b', label: 'Andaime', amount: 0 },
      { id: 'c', label: 'frete', amount: 80 },
    ]
    expect(dropEmptyFreight(costs).map((c) => c.id)).toEqual(['b', 'c'])
    const kept = costs.slice(1)
    expect(dropEmptyFreight(kept)).toBe(kept)
  })
})

describe('displayQuoteNumber', () => {
  it('remove o prefixo ORC- sem alterar o restante', () => {
    expect(displayQuoteNumber('ORC-2026-0001-5')).toBe('2026-0001-5')
    expect(displayQuoteNumber('2026-0001-5')).toBe('2026-0001-5')
    expect(formatDisplayQuoteCode('ORC-2026-0001', 3)).toBe('2026-0001-3')
  })
})

describe('quotePdfFilename', () => {
  it('junta código e primeiro nome do cliente', () => {
    const quote = createEmptyDraft('ORC-2026-0001', catalog.config.version)
    expect(quotePdfFilename(setCustomer(quote, { name: '  Luiz Felipe Souza ' }))).toBe(
      '2026-0001-1-Luiz.pdf',
    )
    expect(quotePdfFilename(setCustomer(quote, { name: 'João/Silva' }))).toBe('2026-0001-1-JoãoSilva.pdf')
    expect(quotePdfFilename(quote)).toBe('2026-0001-1.pdf')
  })
})

describe('quoteShareText', () => {
  it('descreve tipo e cor/espessura sem medidas', () => {
    const quote = sampleQuote()
    const text = quoteShareText(quote, { shopName: 'Forte Vidros' })
    const lines = text.split('\n')

    const espelho = lines.indexOf('*1. Espelho Lapidado*')
    expect(espelho).toBeGreaterThan(-1)
    expect(lines[espelho + 1]).toBe('Prata 04mm')
    expect(lines[espelho + 2]).toMatch(/^R\$/)
    expect(lines[espelho + 3]).toMatch(/^• Instalação — R\$/)

    const correr = lines.indexOf('*2. Janela de correr 2 folhas*')
    expect(correr).toBeGreaterThan(-1)
    expect(lines[correr + 1]).toBe('Alumínio Fosco · Vidro Incolor 08mm')
    expect(lines[correr + 2]).toMatch(/^R\$/)

    const custom = lines.indexOf('*3. Item avulso*')
    expect(custom).toBeGreaterThan(-1)
    expect(lines[custom + 1]).toMatch(/^R\$/)

    expect(text).not.toMatch(/\d+\s*[×x]\s*\d+/)
    expect(text).not.toMatch(/\bmm\b(?!\S)/)
    expect(text).toContain('*Orçamento 2026-0001-1*')
    expect(text).not.toContain('ORC-')
  })

  it('inclui validade da proposta após a chamada', () => {
    const quote = sampleQuote()
    const validUntil = resolveQuoteValidUntil(quote, 15)
    const date = new Date(validUntil).toLocaleDateString('pt-BR')
    const text = quoteShareText(quote, { cta: 'Gostaria de realizar o pedido?' })
    expect(text).toMatch(/Gostaria de realizar o pedido\?\n\n_Validade da proposta: .+_/)
    expect(text).toContain(`_Validade da proposta: ${date}_`)
  })

  it('inclui a observação do item em itálico, depois da cor/espessura', () => {
    let quote = createEmptyDraft('ORC-2026-0002', catalog.config.version)
    quote = addItem(quote, catalog, {
      kind: 'espelho',
      finish: 'Espelho Lapidado',
      widthMm: 1000,
      heightMm: 800,
      glassColor: 'Prata',
      thicknessMm: '04',
      markup: 0.3,
      extras: [],
      note: '  Banheiro social ',
    })
    quote = addItem(quote, catalog, { kind: 'custom', description: 'Película', amount: 80, note: '   ' })
    const lines = quoteShareText(quote).split('\n')

    const espelho = lines.indexOf('*1. Espelho Lapidado*')
    expect(lines[espelho + 1]).toBe('Prata 04mm')
    expect(lines[espelho + 2]).toBe('_Obs.: Banheiro social_')
    expect(lines[espelho + 3]).toMatch(/^R\$/)

    const custom = lines.indexOf('*2. Película*')
    expect(lines[custom + 1]).toMatch(/^R\$/)
  })
})

const espelhoComAdicional: EspelhoInput = {
  kind: 'espelho',
  finish: 'Espelho Lapidado',
  widthMm: 1000,
  heightMm: 800,
  glassColor: 'Prata',
  thicknessMm: '04',
  markup: 0.3,
  extras: [{ id: 'x1', description: 'Adicional de altura', amount: 10 }],
}

function fullQuote(mode: MarginMode, cat: Catalog = catalog): Quote {
  let quote = createEmptyDraft('ORC-2026-0009', cat.config.version, mode)
  quote = addItem(quote, cat, espelhoComAdicional, mode)
  quote = setAdditionalCosts(quote, [{ id: 'f', label: 'Frete', amount: 40 }])
  return setDiscounts(quote, [{ id: 'd', label: 'Desconto', amount: 20 }])
}

describe('cálculo de margem no orçamento completo', () => {
  const modes = ['empresa', 'vendedor', 'autonomo'] as const
  const quotes = Object.fromEntries(modes.map((m) => [m, fullQuote(m)])) as Record<MarginMode, Quote>

  it.each(modes)('%s: mão de obra, item, adicional do item, Frete e desconto', (mode) => {
    const quote = quotes[mode]
    const b = quote.items[0].result.breakdown
    const material = b.glass + b.aluminum + b.hardware + b.accessories
    expect(b.labor).toBeGreaterThan(0)
    expect(b.extras).toBe(10)
    const expected = {
      empresa: (material + b.extras + b.labor) * 1.3,
      vendedor: (material + b.extras) * 1.3 + b.labor,
      autonomo: material + b.extras + b.labor,
    }[mode]
    expect(b.finalPrice).toBeCloseTo(expected, 10)
    expect(quote.marginMode).toBe(mode)
    expect(quote.additionalTotal).toBe(40)
    expect(quote.discountTotal).toBe(20)
    expect(quote.grandTotal).toBeCloseTo(quote.itemsTotal + 40 - 20, 10)
  })

  it('diferença entre modos é só a margem sobre mão de obra e material', () => {
    const b = quotes.empresa.items[0].result.breakdown
    const material = b.glass + b.aluminum + b.hardware + b.accessories
    expect(quotes.empresa.grandTotal - quotes.vendedor.grandTotal).toBeCloseTo(b.labor * 0.3, 2)
    expect(quotes.vendedor.grandTotal - quotes.autonomo.grandTotal).toBeCloseTo((material + b.extras) * 0.3, 2)
  })
})

describe('marginMode no orçamento salvo', () => {
  it('orçamento antigo fica sem o campo; valor desconhecido sai', () => {
    const old = createEmptyDraft('ORC-2026-0001', catalog.config.version)
    const { marginMode: _drop, ...legacy } = old
    void _drop
    expect(normalizeQuote(legacy as Quote).marginMode).toBeUndefined()
    const bad = { ...old, marginMode: 'lucro' } as unknown as Quote
    expect(normalizeQuote(bad).marginMode).toBeUndefined()
    expect(normalizeQuote({ ...old, marginMode: 'vendedor' }).marginMode).toBe('vendedor')
  })
})

describe('rascunho desatualizado', () => {
  const draft = fullQuote('empresa')
  const newer: Catalog = { ...catalog, config: { ...catalog.config, version: `${catalog.config.version}-novo` } }

  it('em dia: null', () => {
    expect(draftOutdated(draft, catalog, 'empresa')).toBeNull()
  })

  it('só catálogo, só margem, os dois', () => {
    expect(draftOutdated(draft, newer, 'empresa')).toEqual({ catalog: true, margin: false })
    expect(draftOutdated(draft, catalog, 'vendedor')).toEqual({ catalog: false, margin: true })
    expect(draftOutdated(draft, newer, 'autonomo')).toEqual({ catalog: true, margin: true })
  })

  it('sem marginMode conta como empresa', () => {
    const { marginMode: _drop, ...legacy } = draft
    void _drop
    expect(draftOutdated(legacy as Quote, catalog, 'empresa')).toBeNull()
  })

  it('emitido e rascunho só com avulsos: null', () => {
    const emitted = emitQuote(setCustomer(draft, { name: 'Ana' }))
    expect(draftOutdated(emitted, newer, 'vendedor')).toBeNull()
    const custom = addItem(createEmptyDraft('ORC-2026-0010', 'antiga'), catalog, {
      kind: 'custom',
      description: 'Película',
      amount: 80,
    })
    expect(draftOutdated(custom, catalog, 'vendedor')).toBeNull()
  })

  it('revisão de emitido antigo fica desatualizada', () => {
    const emitted = emitQuote(setCustomer(draft, { name: 'Ana' }))
    expect(draftOutdated(createRevision(emitted), catalog, 'vendedor')).toEqual({
      catalog: false,
      margin: true,
    })
  })
})

describe('repriceDraft', () => {
  it('recalcula com modo e catálogo atuais, sem mexer em Frete e desconto', () => {
    const draft = fullQuote('empresa')
    const newer: Catalog = { ...catalog, config: { ...catalog.config, version: 'v2' } }
    const { quote, failed } = repriceDraft(draft, newer, 'vendedor')
    expect(failed).toBe(0)
    expect(quote.marginMode).toBe('vendedor')
    expect(quote.pricingVersion).toBe('v2')
    expect(quote.items[0].result.breakdown.finalPrice).toBeCloseTo(
      fullQuote('vendedor').items[0].result.breakdown.finalPrice,
      10,
    )
    expect(quote.additionalCosts).toEqual(draft.additionalCosts)
    expect(quote.discounts).toEqual(draft.discounts)
    expect(quote.grandTotal).toBeCloseTo(quote.itemsTotal + 40 - 20, 10)
    expect(draftOutdated(quote, newer, 'vendedor')).toBeNull()
  })

  it('item com código desativado mantém o valor anterior', () => {
    let draft = fullQuote('empresa')
    draft = addItem(draft, catalog, { kind: 'custom', description: 'Película', amount: 80 }, 'empresa')
    const inactive: Catalog = {
      ...catalog,
      vidros: catalog.vidros.map((v) =>
        v.tipo === 'Espelho Lapidado' && v.cor === 'Prata' ? { ...v, ativo: false } : v,
      ),
    }
    const { quote, failed } = repriceDraft(draft, inactive, 'autonomo')
    expect(failed).toBe(1)
    expect(quote.items[0].result).toBe(draft.items[0].result)
    expect(quote.items[1].result.breakdown.finalPrice).toBe(80)
  })

  it('emitido lança', () => {
    const emitted = emitQuote(setCustomer(fullQuote('empresa'), { name: 'Ana' }))
    expect(() => repriceDraft(emitted, catalog, 'vendedor')).toThrow()
  })
})

describe('data do aviso de rascunho desatualizado', () => {
  const withVersion = (version: string): Catalog => ({ ...catalog, config: { ...catalog.config, version } })

  it('lê a versão do catálogo como data', () => {
    expect(catalogVersionDate('2026-10-06')?.toLocaleDateString('pt-BR')).toBe('06/10/2026')
    expect(catalogVersionDate('2026-10-06T14:30')?.toISOString()).toBe('2026-10-06T14:30:00.000Z')
    expect(catalogVersionDate('v3')).toBeNull()
  })

  it('usa a data da mudança marcada; ambas pegam a mais recente', () => {
    const cat = withVersion('2026-10-06')
    const changed = '2026-10-07T18:00:00.000Z'
    expect(outdatedSince({ catalog: true, margin: false }, cat, changed)?.toLocaleDateString('pt-BR')).toBe('06/10/2026')
    expect(outdatedSince({ catalog: false, margin: true }, cat, changed)?.toISOString()).toBe(changed)
    expect(outdatedSince({ catalog: true, margin: true }, cat, changed)?.toISOString()).toBe(changed)
  })

  it('sem data conhecida retorna null', () => {
    expect(outdatedSince({ catalog: false, margin: true }, catalog)).toBeNull()
    expect(outdatedSince({ catalog: true, margin: false }, withVersion('v3'))).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from '../data/seedCatalog'
import {
  addItem,
  createEmptyDraft,
  displayQuoteNumber,
  formatDisplayQuoteCode,
  quotePdfFilename,
  quoteShareText,
  resolveQuoteValidUntil,
  setCustomer,
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

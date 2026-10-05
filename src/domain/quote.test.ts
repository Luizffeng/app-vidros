import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from '../data/seedCatalog'
import { addItem, createEmptyDraft, quoteShareText, setCustomer } from './quote'

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
  })
})

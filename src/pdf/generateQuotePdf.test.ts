import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from '../data/seedCatalog'
import { addItem, createEmptyDraft, setCustomer } from '../domain/quote'
import { generateQuotePdf } from './generateQuotePdf'

const catalog = loadSeedCatalog()

describe('generateQuotePdf itens', () => {
  it('mostra tipo e cor/espessura, sem medidas', async () => {
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
      extras: [{ id: 'x1', description: 'Instalacao', amount: 50 }],
      note: 'Banheiro',
    })
    quote = addItem(quote, catalog, {
      kind: 'pivotante',
      widthMm: 950,
      heightMm: 2150,
      glassColor: 'Incolor',
      thicknessMm: '10',
      profileColor: 'Fosco',
      hasLatch: true,
      markup: 0.3,
      extras: [],
    })

    const blob = await generateQuotePdf(quote)
    const raw = new TextDecoder('latin1').decode(await blob.arrayBuffer())

    expect(raw).toContain('(1. Espelho Lapidado)')
    expect(raw).toContain('(Prata 04mm)')
    expect(raw).toContain('(Obs.: Banheiro)')
    expect(raw).toContain('(1.a. Adicional: Instalacao')
    expect(raw).toContain('(2. Porta pivotante com trinco)')
    expect(raw).toContain('(Alumínio Fosco · Vidro Incolor 10mm)')
    expect(raw).not.toContain('3445')
    expect(raw).not.toContain('2150')
  })
})

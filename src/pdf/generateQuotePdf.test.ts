import { describe, expect, it } from 'vitest'
import { defaultSettings } from '../data/defaultSettings'
import { loadSeedCatalog } from '../data/seedCatalog'
import { addItem, createEmptyDraft, emitQuote, setCustomer } from '../domain/quote'
import { generateQuotePdf } from './generateQuotePdf'

const catalog = loadSeedCatalog()

async function pdfText(quote: Parameters<typeof generateQuotePdf>[0], options?: Parameters<typeof generateQuotePdf>[1]) {
  const blob = await generateQuotePdf(quote, options)
  return new TextDecoder('latin1').decode(await blob.arrayBuffer())
}

function sampleDraft() {
  let quote = createEmptyDraft('ORC-2026-0001', catalog.config.version)
  quote = setCustomer(quote, { name: 'Maria' })
  return addItem(quote, catalog, {
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
}

describe('generateQuotePdf itens', () => {
  it('mostra tipo e cor/espessura, sem medidas', async () => {
    let quote = sampleDraft()
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

    const raw = await pdfText(quote)

    expect(raw).toContain('(1. Espelho Lapidado)')
    expect(raw).toContain('(Prata 04mm)')
    expect(raw).toContain('(Obs.: Banheiro)')
    // Extra cost R$ 50 with 30% empresa margin → sell R$ 65 (never raw cost)
    expect(raw).toContain('1.a. Adicional: Instalacao')
    expect(raw).toMatch(/65,00/)
    expect(raw).not.toMatch(/\(R\$\s*50,00\)/)
    expect(raw).toContain('(2. Porta pivotante com trinco)')
    expect(raw).toContain('(Alumínio Fosco · Vidro Incolor 10mm)')
    expect(raw).not.toContain('3445')
    expect(raw).not.toContain('2150')
  })
})

describe('generateQuotePdf cabeçalho e total', () => {
  it('rascunho marca Rascunho; emitido só o número, sem Emitido', async () => {
    const draft = sampleDraft()
    const draftRaw = await pdfText(draft)
    expect(draftRaw).toContain('Rascunho')
    expect(draftRaw).not.toContain('Emitido')

    const emitted = emitQuote(draft, 15)
    const emittedRaw = await pdfText(emitted)
    expect(emittedRaw).not.toContain('Emitido')
    expect(emittedRaw).not.toContain('Rascunho')
    expect(emittedRaw).toContain('2026-0001-1')
  })

  it('inclui condições de pagamento quando preenchidas', async () => {
    const quote = emitQuote(sampleDraft(), 15)
    const settings = { ...defaultSettings(), paymentTerms: 'Pix a vista.' }
    const raw = await pdfText(quote, { settings })
    expect(raw).toContain('TOTAL:')
    expect(raw).toContain('Pix a vista.')
  })
})

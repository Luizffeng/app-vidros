import { describe, expect, it } from 'vitest'
import { normalizeCatalog } from '../data/catalogItems'
import { toExampleCatalog } from '../data/exampleCatalog'
import { loadSeedCatalog } from '../data/seedCatalog'
import { setCatalogPrice } from './catalogEdit'
import {
  clearEditedExamples,
  confirmExampleTable,
  exampleNames,
  examplePending,
  exampleUseInQuote,
  firstExampleTab,
  onboardingTasks,
  onboardingVisible,
  usesExample,
} from './onboarding'
import { priceItem } from './pricing'
import type { AppSettings, Catalog, ItemInput, Quote } from './types'

const example = normalizeCatalog(toExampleCatalog(loadSeedCatalog()))

const settings = (establishment: Partial<AppSettings['establishment']> = {}, extra: Partial<AppSettings> = {}) =>
  ({
    quoteValidityDays: 15,
    marginMode: 'empresa',
    shareCta: '',
    paymentTerms: '',
    establishment: { name: '', ...establishment },
    ...extra,
  }) as AppSettings

function quote(catalog: Catalog, inputs: ItemInput[], status: Quote['status'] = 'draft'): Quote {
  return {
    id: 'q1',
    number: 'ORC-1',
    revision: 0,
    status,
    createdAt: '2026-10-14T12:00:00Z',
    updatedAt: '2026-10-14T12:00:00Z',
    customer: {},
    items: inputs.map((input, i) => ({ id: `i${i}`, input, result: priceItem(catalog, input) })),
    additionalCosts: [],
    discounts: [],
    pricingVersion: catalog.config.version,
    itemsTotal: 0,
    additionalTotal: 0,
    discountTotal: 0,
    grandTotal: 0,
  } as Quote
}

const box: ItemInput = {
  kind: 'box',
  spanCm: 120,
  glassColor: 'Incolor',
  profileColor: 'Fosco',
  markup: 0.3,
  extras: [],
}

const confirmAll = (catalog: Catalog) =>
  (['vidros', 'kitBox', 'acessorios', 'aluminios', 'config'] as const).reduce(confirmExampleTable, catalog)

describe('onboardingTasks', () => {
  it('conta novo: tudo pendente; ferragens abre na primeira aba com exemplo', () => {
    const tasks = onboardingTasks(example, settings(), [])
    expect(tasks.map((t) => [t.id, t.done])).toEqual([
      ['loja', false],
      ['vidros', false],
      ['ferragens', false],
      ['maoDeObra', false],
      ['primeiroOrcamento', false],
    ])
    expect(tasks.find((t) => t.id === 'ferragens')?.tab).toBe('kitBox')
  })

  it('cada parte confirmada conclui a tarefa dela', () => {
    let catalog = confirmExampleTable(example, 'kitBox')
    expect(onboardingTasks(catalog, settings(), []).find((t) => t.id === 'ferragens')?.tab).toBe('acessorios')

    catalog = confirmAll(example)
    const tasks = onboardingTasks(catalog, settings({ name: 'Loja', phone: '37999990000' }), [
      quote(catalog, [box], 'emitted'),
    ])
    expect(tasks.every((t) => t.done)).toBe(true)
    expect(onboardingVisible(tasks, settings())).toBe(true)
  })

  it('linha sem preço ou inativa não segura a tarefa', () => {
    const catalog: Catalog = {
      ...example,
      vidros: example.vidros.map((v, i) => (i === 0 ? { ...v, ativo: false } : { ...v, valorM2: 0 })),
    }
    expect(examplePending(catalog, 'vidros')).toBe(0)
    expect(onboardingTasks(catalog, settings(), []).find((t) => t.id === 'vidros')?.done).toBe(true)
  })

  it('só "Dispensar para sempre" esconde o card', () => {
    const tasks = onboardingTasks(example, settings(), [])
    expect(onboardingVisible(tasks, settings())).toBe(true)
    expect(onboardingVisible(tasks, settings({}, { onboardingDismissedAt: '2026-10-14T12:00:00Z' }))).toBe(false)
    expect(onboardingVisible([], settings())).toBe(false)
  })
})

describe('exampleUseInQuote', () => {
  it('lista materiais e mão de obra de exemplo do orçamento', () => {
    const use = exampleUseInQuote(quote(example, [box]), example)
    expect(usesExample(use)).toBe(true)
    expect(use.config).toBe(true)
    expect(new Set(use.refs.map((r) => r.table))).toEqual(new Set(['vidros', 'kitBox', 'acessorios']))
    expect(firstExampleTab(use)).toBe(use.refs[0].table)
    expect(exampleNames(use)).toBe('vidros, kits de box, acessórios e mão de obra')
  })

  it('preço só deste orçamento e preço editado deixam de contar', () => {
    const q = quote(example, [box])
    const [first, ...rest] = exampleUseInQuote(q, example).refs
    const withOverride = { ...q, priceOverrides: [{ ref: first, price: 1 }] }
    expect(exampleUseInQuote(withOverride, example).refs).toEqual(rest)

    const edited = rest.reduce((c, ref) => setCatalogPrice(c, ref, 5), example)
    expect(exampleUseInQuote(withOverride, edited).refs).toEqual([])
  })

  it('catálogo confirmado: nada a avisar', () => {
    const catalog = confirmAll(example)
    expect(usesExample(exampleUseInQuote(quote(catalog, [box]), catalog))).toBe(false)
  })

  it('item avulso não usa catálogo', () => {
    const custom: ItemInput = { kind: 'custom', description: 'Serviço', amount: 100 }
    expect(usesExample(exampleUseInQuote(quote(example, [custom]), example))).toBe(false)
  })
})

describe('clearEditedExamples', () => {
  it('só a linha com preço mudado perde o exemplo', () => {
    const [a, b] = example.vidros
    const after: Catalog = {
      ...example,
      vidros: example.vidros.map((v) => (v.id === a.id ? { ...v, valorM2: (v.valorM2 ?? 0) + 10 } : v)),
    }
    const saved = clearEditedExamples(example, after)
    expect(saved.vidros.find((v) => v.id === a.id)?.exemplo).toBeUndefined()
    expect(saved.vidros.find((v) => v.id === b.id)?.exemplo).toBe(true)
    expect(saved.config.exemplo).toBe(true)
  })

  it('mudar mão de obra ou margem confirma a configuração', () => {
    const after: Catalog = {
      ...example,
      config: { ...example.config, labor: { ...example.config.labor, boxAvulso: example.config.labor.boxAvulso + 5 } },
    }
    expect(clearEditedExamples(example, after).config.exemplo).toBeUndefined()
  })

  it('linha nova não tem exemplo e fica como está', () => {
    const extra = { ...example.vidros[0], id: 999999, exemplo: undefined }
    const after: Catalog = { ...example, vidros: [...example.vidros, extra] }
    expect(clearEditedExamples(example, after).vidros.at(-1)).toEqual(extra)
  })
})

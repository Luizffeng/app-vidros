import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadSeedCatalog } from '../data/seedCatalog'
import {
  aluminioValorMetro,
  bumpCatalogVersion,
  catalogPrice,
  setCatalogPrice,
  withPriceOverrides,
} from './catalogEdit'

const catalog = loadSeedCatalog()

describe('bumpCatalogVersion', () => {
  afterEach(() => vi.useRealTimers())

  it('primeira mudança do dia: data; segunda: data e minuto UTC', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-07T18:20:30Z'))
    expect(bumpCatalogVersion('2026-07-10')).toBe('2026-10-07')
    expect(bumpCatalogVersion('2026-10-07')).toBe('2026-10-07T18:20')
    expect(bumpCatalogVersion('2026-10-07T17:00')).toBe('2026-10-07T18:20')
  })
})

describe('preços do catálogo', () => {
  const vidro = catalog.vidros.find((v) => v.valorM2 != null)!
  const aluminio = catalog.aluminios[0]

  it('aluminioValorMetro arredonda em centavos', () => {
    expect(aluminioValorMetro(100, 6)).toBe(16.67)
    expect(aluminioValorMetro(100, 0)).toBe(0)
  })

  it('catalogPrice lê o campo editável e ignora linha ausente ou inativa', () => {
    expect(catalogPrice(catalog, { table: 'vidros', id: vidro.id })).toBe(vidro.valorM2)
    expect(catalogPrice(catalog, { table: 'aluminios', id: aluminio.id })).toBe(aluminio.valorBarra)
    expect(catalogPrice(catalog, { table: 'vidros', id: -1 })).toBeNull()
    const inactive = { ...catalog, vidros: catalog.vidros.map((v) => (v.id === vidro.id ? { ...v, ativo: false } : v)) }
    expect(catalogPrice(inactive, { table: 'vidros', id: vidro.id })).toBeNull()
  })

  it('setCatalogPrice troca um preço sem mexer no original; alumínio recalcula R$/m', () => {
    const next = setCatalogPrice(catalog, { table: 'aluminios', id: aluminio.id }, 120)
    const row = next.aluminios.find((a) => a.id === aluminio.id)!
    expect(row.valorBarra).toBe(120)
    expect(row.valorMetro).toBe(aluminioValorMetro(120, aluminio.metragemBarra))
    expect(catalog.aluminios[0].valorBarra).toBe(aluminio.valorBarra)
    expect(next.config.version).toBe(catalog.config.version)

    const acc = catalog.acessorios[0]
    expect(setCatalogPrice(catalog, { table: 'acessorios', id: acc.id }, 9).acessorios[0].valor).toBe(9)
    const kit = catalog.kitBox[0]
    expect(setCatalogPrice(catalog, { table: 'kitBox', id: kit.id }, 9).kitBox[0].valor).toBe(9)
  })

  it('withPriceOverrides aplica preços e ignora linha ausente ou inativa', () => {
    expect(withPriceOverrides(catalog, undefined)).toBe(catalog)
    const next = withPriceOverrides(catalog, [
      { ref: { table: 'vidros', id: vidro.id }, price: 1 },
      { ref: { table: 'vidros', id: -1 }, price: 2 },
    ])
    expect(next.vidros.find((v) => v.id === vidro.id)!.valorM2).toBe(1)
    expect(next.vidros.length).toBe(catalog.vidros.length)
  })
})

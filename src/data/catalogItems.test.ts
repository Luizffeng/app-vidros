import { describe, expect, it } from 'vitest'
import { loadSeedCatalog } from './seedCatalog'
import {
  hasCatalogCodigo,
  nextNumericId,
  normalizeCatalog,
  parseImportedCatalog,
} from './catalogItems'

describe('catalogItems', () => {
  it('nextNumericId increments from max id', () => {
    expect(nextNumericId([{ id: 1 }, { id: 7 }, { id: 3 }])).toBe(8)
    expect(nextNumericId([])).toBe(1)
  })

  it('hasCatalogCodigo rejects null/empty', () => {
    expect(hasCatalogCodigo({ codigo: '1001' })).toBe(true)
    expect(hasCatalogCodigo({ codigo: null })).toBe(false)
    expect(hasCatalogCodigo({ codigo: '  ' })).toBe(false)
  })

  it('normalizeCatalog defaults ativo and drops empty codigo', () => {
    const seed = loadSeedCatalog()
    const normalized = normalizeCatalog({
      ...seed,
      vidros: [{ ...seed.vidros[0], ativo: undefined }],
      acessorios: [
        ...seed.acessorios.slice(0, 1),
        { id: 999, codigo: null as unknown as string, descricao: null as unknown as string, valor: 0 },
      ],
    })
    expect(normalized.vidros[0].ativo).toBe(true)
    expect(normalized.acessorios.every(hasCatalogCodigo)).toBe(true)
    expect(normalized.acessorios.some((a) => a.id === 999)).toBe(false)
  })

  it('parseImportedCatalog round-trips full seed export', () => {
    const seed = normalizeCatalog(loadSeedCatalog())
    const parsed = parseImportedCatalog(JSON.parse(JSON.stringify(seed)))
    expect(parsed.vidros.length).toBe(seed.vidros.length)
    expect(parsed.kitBox.length).toBe(seed.kitBox.length)
    expect(parsed.acessorios.length).toBe(seed.acessorios.length)
    expect(parsed.aluminios.length).toBe(seed.aluminios.length)
    expect(parsed.config.version).toBe(seed.config.version)
  })

  it('parseImportedCatalog accepts seed with placeholder acessorios', () => {
    const seed = loadSeedCatalog()
    const withPlaceholders = {
      ...seed,
      acessorios: [
        ...seed.acessorios,
        { id: 900, codigo: null, descricao: null, valor: 0 },
        { id: 901, codigo: '', descricao: '', valor: 0 },
      ],
    }
    const parsed = parseImportedCatalog(JSON.parse(JSON.stringify(withPlaceholders)))
    expect(parsed.acessorios.length).toBe(seed.acessorios.filter(hasCatalogCodigo).length)
  })

  it('parseImportedCatalog rejects missing sections', () => {
    expect(() => parseImportedCatalog({})).toThrow(/falta config/)
    expect(() =>
      parseImportedCatalog({
        config: {},
        vidros: [],
        kitBox: 'nope',
        acessorios: [],
        aluminios: [],
      }),
    ).toThrow(/kitBox/)
  })

  it('parseImportedCatalog rejects row with non-numeric id', () => {
    const seed = loadSeedCatalog()
    expect(() =>
      parseImportedCatalog({
        config: seed.config,
        vidros: [
          {
            id: '1' as unknown as number,
            codigo: 'X',
            tipo: 'Temperado',
            cor: 'Incolor',
            espessuraMm: '08',
            valorM2: 1,
          },
        ],
        kitBox: [seed.kitBox[0]],
        acessorios: [seed.acessorios[0]],
        aluminios: [seed.aluminios[0]],
      }),
    ).toThrow(/vidros/)
  })
})

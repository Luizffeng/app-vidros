import { isCatalogItemActive } from '../domain/catalogActive'
import type {
  Acessorio,
  Aluminio,
  Catalog,
  KitBox,
  PricingConfig,
  Vidro,
} from '../domain/types'
import { normalizePricingConfig } from './seedCatalog'

export { isCatalogItemActive }

export function nextNumericId(items: { id: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1
}

export function normalizeCatalog(catalog: Catalog): Catalog {
  return {
    config: normalizePricingConfig(catalog.config),
    vidros: catalog.vidros.map((v) => ({ ...v, ativo: v.ativo !== false })),
    kitBox: catalog.kitBox.map((k) => ({ ...k, ativo: k.ativo !== false })),
    acessorios: catalog.acessorios.map((a) => ({ ...a, ativo: a.ativo !== false })),
    aluminios: catalog.aluminios.map((a) => ({ ...a, ativo: a.ativo !== false })),
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function requireArray(v: unknown, label: string): unknown[] {
  if (!Array.isArray(v)) throw new Error(`Catálogo inválido: ${label} deve ser lista.`)
  return v
}

/** Valida JSON importado e devolve Catalog normalizado */
export function parseImportedCatalog(raw: unknown): Catalog {
  if (!isRecord(raw)) throw new Error('JSON inválido: esperado objeto do catálogo.')
  if (!isRecord(raw.config)) throw new Error('JSON inválido: falta config.')

  const catalog: Catalog = {
    config: raw.config as unknown as PricingConfig,
    vidros: requireArray(raw.vidros, 'vidros') as Vidro[],
    kitBox: requireArray(raw.kitBox, 'kitBox') as KitBox[],
    acessorios: requireArray(raw.acessorios, 'acessorios') as Acessorio[],
    aluminios: requireArray(raw.aluminios, 'aluminios') as Aluminio[],
  }

  if (catalog.vidros.some((v) => typeof v.id !== 'number' || !v.codigo)) {
    throw new Error('JSON inválido: vidros precisam de id e codigo.')
  }
  if (catalog.kitBox.some((k) => typeof k.id !== 'number' || !k.codigo)) {
    throw new Error('JSON inválido: kitBox precisa de id e codigo.')
  }
  if (catalog.acessorios.some((a) => typeof a.id !== 'number' || !a.codigo)) {
    throw new Error('JSON inválido: acessorios precisam de id e codigo.')
  }
  if (catalog.aluminios.some((a) => typeof a.id !== 'number' || !a.codigo)) {
    throw new Error('JSON inválido: aluminios precisam de id e codigo.')
  }

  return normalizeCatalog(catalog)
}

export function downloadCatalogJson(catalog: Catalog, filename?: string) {
  const payload = JSON.stringify(normalizeCatalog(catalog), null, 2)
  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? `forte-vidros-catalogo-${catalog.config.version}.json`
  a.click()
  URL.revokeObjectURL(url)
}

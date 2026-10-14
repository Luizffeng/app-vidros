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

/** Seed legado traz linhas vazias (codigo null) — descartar no normalize/import/export */
export function hasCatalogCodigo(item: { codigo?: string | null }): boolean {
  return typeof item.codigo === 'string' && item.codigo.trim().length > 0
}

/** `exemplo` só fica quando `true`; ausente = preço conferido. */
function keepExemplo<T extends { exemplo?: boolean }>(row: T): T {
  const { exemplo, ...rest } = row
  return (exemplo === true ? { ...rest, exemplo: true } : rest) as T
}

function normalizeRow<T extends { ativo?: boolean; exemplo?: boolean }>(row: T): T {
  return keepExemplo({ ...row, ativo: row.ativo !== false })
}

export function normalizeCatalog(catalog: Catalog): Catalog {
  return {
    config: keepExemplo(normalizePricingConfig(catalog.config)),
    vidros: catalog.vidros.filter(hasCatalogCodigo).map(normalizeRow),
    kitBox: catalog.kitBox.filter(hasCatalogCodigo).map(normalizeRow),
    acessorios: catalog.acessorios.filter(hasCatalogCodigo).map(normalizeRow),
    aluminios: catalog.aluminios.filter(hasCatalogCodigo).map(normalizeRow),
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function requireArray(v: unknown, label: string): unknown[] {
  if (!Array.isArray(v)) throw new Error(`Catálogo inválido: ${label} deve ser lista.`)
  return v
}

function assertRowsHaveIdAndCodigo(
  rows: { id: number; codigo?: string | null }[],
  label: string,
) {
  if (rows.some((r) => typeof r.id !== 'number' || !hasCatalogCodigo(r))) {
    throw new Error(`JSON inválido: ${label} precisam de id e codigo.`)
  }
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

  const normalized = normalizeCatalog(catalog)

  assertRowsHaveIdAndCodigo(normalized.vidros, 'vidros')
  assertRowsHaveIdAndCodigo(normalized.kitBox, 'kitBox')
  assertRowsHaveIdAndCodigo(normalized.acessorios, 'acessorios')
  assertRowsHaveIdAndCodigo(normalized.aluminios, 'aluminios')

  return normalized
}

export function downloadCatalogJson(catalog: Catalog, filename?: string) {
  const payload = JSON.stringify(normalizeCatalog(catalog), null, 2)
  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? `app-vidros-catalogo-${catalog.config.version}.json`
  a.click()
  URL.revokeObjectURL(url)
}

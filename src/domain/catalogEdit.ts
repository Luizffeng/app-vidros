import { isCatalogItemActive } from './catalogActive'
import type { Catalog, CatalogRef, PriceOverride } from './types'

/** Version is today's date; a second save on the same day gets the UTC minute. */
export function bumpCatalogVersion(current: string): string {
  const day = new Date().toISOString().slice(0, 10)
  if (current === day || current.startsWith(`${day}T`)) {
    return new Date().toISOString().slice(0, 16)
  }
  return day
}

export function aluminioValorMetro(valorBarra: number, metragemBarra: number): number {
  return metragemBarra > 0 ? Math.round((valorBarra / metragemBarra) * 100) / 100 : 0
}

export function sameRef(a: CatalogRef, b: CatalogRef): boolean {
  return a.table === b.table && a.id === b.id
}

/** Editable price of an active row (vidros valorM2, kitBox/acessorios valor, aluminios valorBarra). */
export function catalogPrice(catalog: Catalog, ref: CatalogRef): number | null {
  const row = catalog[ref.table].find((r) => r.id === ref.id)
  if (!row || !isCatalogItemActive(row)) return null
  switch (ref.table) {
    case 'vidros':
      return (row as Catalog['vidros'][number]).valorM2
    case 'kitBox':
      return (row as Catalog['kitBox'][number]).valor
    case 'acessorios':
      return (row as Catalog['acessorios'][number]).valor
    case 'aluminios':
      return (row as Catalog['aluminios'][number]).valorBarra
  }
}

/** Row without the example flag: a price the user set is confirmed. */
export function confirmed<T extends { exemplo?: boolean }>(row: T): T {
  const { exemplo: _exemplo, ...rest } = row
  void _exemplo
  return rest as T
}

/** New catalog with one price replaced (aluminios re-derive valorMetro), example flag cleared. No version bump. */
export function setCatalogPrice(catalog: Catalog, ref: CatalogRef, price: number): Catalog {
  switch (ref.table) {
    case 'vidros':
      return {
        ...catalog,
        vidros: catalog.vidros.map((r) => (r.id === ref.id ? confirmed({ ...r, valorM2: price }) : r)),
      }
    case 'kitBox':
      return {
        ...catalog,
        kitBox: catalog.kitBox.map((r) => (r.id === ref.id ? confirmed({ ...r, valor: price }) : r)),
      }
    case 'acessorios':
      return {
        ...catalog,
        acessorios: catalog.acessorios.map((r) => (r.id === ref.id ? confirmed({ ...r, valor: price }) : r)),
      }
    case 'aluminios':
      return {
        ...catalog,
        aluminios: catalog.aluminios.map((r) =>
          r.id === ref.id
            ? confirmed({ ...r, valorBarra: price, valorMetro: aluminioValorMetro(price, r.metragemBarra) })
            : r,
        ),
      }
  }
}

/** Catalog copy with the quote's own prices; missing or inactive rows are ignored. */
export function withPriceOverrides(catalog: Catalog, overrides?: PriceOverride[]): Catalog {
  if (!overrides?.length) return catalog
  return overrides.reduce(
    (cat, o) => (catalogPrice(cat, o.ref) == null ? cat : setCatalogPrice(cat, o.ref, o.price)),
    catalog,
  )
}

export type CatalogTab = 'vidros' | 'kitBox' | 'acessorios' | 'aluminios' | 'config'
export type SettingsTab = 'register' | 'quote' | 'logo'
export type QuoteFilter = 'draft' | 'emitted'

export type Route =
  | { screen: 'home' }
  | { screen: 'quotes'; filter?: QuoteFilter; q?: string }
  | { screen: 'quote'; id: string }
  | { screen: 'catalog'; tab: CatalogTab }
  | { screen: 'settings'; tab: SettingsTab }

export type Screen = Route['screen']

const CATALOG_SLUGS: Record<CatalogTab, string> = {
  vidros: 'vidros',
  kitBox: 'kit-box',
  acessorios: 'acessorios',
  aluminios: 'aluminios',
  config: 'configuracao',
}

const SETTINGS_SLUGS: Record<SettingsTab, string> = {
  register: 'cadastro',
  quote: 'orcamento',
  logo: 'logo',
}

const FILTER_SLUGS: Record<QuoteFilter, string> = {
  draft: 'rascunhos',
  emitted: 'emitidos',
}

function fromSlug<T extends string>(slugs: Record<T, string>, slug: string | undefined): T | undefined {
  return (Object.keys(slugs) as T[]).find((key) => slugs[key] === slug)
}

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

/** Unknown paths fall back to home; unknown tabs to the first tab. */
export function parseRoute(pathname: string, search = ''): Route {
  const parts = pathname.split('/').filter(Boolean)
  const params = new URLSearchParams(search)
  switch (parts[0]) {
    case 'orcamentos': {
      if (parts[1]) return { screen: 'quote', id: decode(parts[1]) }
      const route: Route = { screen: 'quotes' }
      const filter = fromSlug(FILTER_SLUGS, params.get('filtro') ?? undefined)
      const q = params.get('busca')?.trim()
      if (filter) route.filter = filter
      if (q) route.q = q
      return route
    }
    case 'catalogo':
      return { screen: 'catalog', tab: fromSlug(CATALOG_SLUGS, parts[1]) ?? 'vidros' }
    case 'configuracoes':
      return { screen: 'settings', tab: fromSlug(SETTINGS_SLUGS, parts[1]) ?? 'register' }
    default:
      return { screen: 'home' }
  }
}

export function formatRoute(route: Route): string {
  switch (route.screen) {
    case 'home':
      return '/'
    case 'quotes': {
      const params = new URLSearchParams()
      if (route.filter) params.set('filtro', FILTER_SLUGS[route.filter])
      if (route.q?.trim()) params.set('busca', route.q.trim())
      const query = params.toString()
      return query ? `/orcamentos?${query}` : '/orcamentos'
    }
    case 'quote':
      return `/orcamentos/${encodeURIComponent(route.id)}`
    case 'catalog':
      return `/catalogo/${CATALOG_SLUGS[route.tab]}`
    case 'settings':
      return `/configuracoes/${SETTINGS_SLUGS[route.tab]}`
  }
}

export function parentOf(route: Route): Route | null {
  switch (route.screen) {
    case 'home':
      return null
    case 'quote':
      return { screen: 'quotes' }
    default:
      return { screen: 'home' }
  }
}

/** Screens above `route` in the screen map, root first. */
export function ancestors(route: Route): Route[] {
  const chain: Route[] = []
  for (let parent = parentOf(route); parent; parent = parentOf(parent)) chain.unshift(parent)
  return chain
}

export function sameScreen(a: Route, b: Route): boolean {
  if (a.screen !== b.screen) return false
  return a.screen !== 'quote' || a.id === (b as { id: string }).id
}

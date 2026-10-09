import { describe, expect, it } from 'vitest'
import { ancestors, formatRoute, parseRoute, sameScreen, type Route } from './routes'

const parseUrl = (url: string) => {
  const [path, query = ''] = url.split('?')
  return parseRoute(path, query ? `?${query}` : '')
}

describe('routes', () => {
  it('round-trips every route shape', () => {
    const routes: Route[] = [
      { screen: 'home' },
      { screen: 'quotes' },
      { screen: 'quotes', filter: 'draft' },
      { screen: 'quotes', filter: 'emitted', q: 'joão silva' },
      { screen: 'quote', id: 'abc-123' },
      { screen: 'catalog', tab: 'vidros' },
      { screen: 'catalog', tab: 'kitBox' },
      { screen: 'catalog', tab: 'acessorios' },
      { screen: 'catalog', tab: 'aluminios' },
      { screen: 'catalog', tab: 'config' },
      { screen: 'settings', tab: 'register' },
      { screen: 'settings', tab: 'quote' },
      { screen: 'settings', tab: 'logo' },
    ]
    for (const route of routes) expect(parseUrl(formatRoute(route))).toEqual(route)
  })

  it('uses Portuguese slugs', () => {
    expect(formatRoute({ screen: 'catalog', tab: 'kitBox' })).toBe('/catalogo/kit-box')
    expect(formatRoute({ screen: 'settings', tab: 'register' })).toBe('/configuracoes/cadastro')
    expect(formatRoute({ screen: 'quotes', filter: 'draft' })).toBe('/orcamentos?filtro=rascunhos')
  })

  it('falls back to the first tab and to home', () => {
    expect(parseRoute('/catalogo')).toEqual({ screen: 'catalog', tab: 'vidros' })
    expect(parseRoute('/catalogo/xyz')).toEqual({ screen: 'catalog', tab: 'vidros' })
    expect(parseRoute('/configuracoes/')).toEqual({ screen: 'settings', tab: 'register' })
    expect(parseRoute('/nada/aqui')).toEqual({ screen: 'home' })
    expect(parseRoute('/')).toEqual({ screen: 'home' })
  })

  it('ignores unknown filter and blank search', () => {
    expect(parseRoute('/orcamentos', '?filtro=todos&busca=%20')).toEqual({ screen: 'quotes' })
  })

  it('builds the parent chain', () => {
    expect(ancestors({ screen: 'quote', id: 'x' })).toEqual([{ screen: 'home' }, { screen: 'quotes' }])
    expect(ancestors({ screen: 'catalog', tab: 'logo' as never })).toEqual([{ screen: 'home' }])
    expect(ancestors({ screen: 'home' })).toEqual([])
  })

  it('compares screens ignoring tabs and filters', () => {
    expect(sameScreen({ screen: 'catalog', tab: 'vidros' }, { screen: 'catalog', tab: 'config' })).toBe(true)
    expect(sameScreen({ screen: 'quote', id: 'a' }, { screen: 'quote', id: 'b' })).toBe(false)
    expect(sameScreen({ screen: 'quotes' }, { screen: 'home' })).toBe(false)
  })
})

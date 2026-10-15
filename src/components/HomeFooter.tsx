import type { MouseEvent } from 'react'
import { companyLine } from '../data/company'
import { push } from '../nav/navigator'
import { formatRoute, type Route } from '../nav/routes'

function RouteLink({ route, children }: { route: Route; children: string }) {
  return (
    <a
      href={formatRoute(route)}
      onClick={(e: MouseEvent) => {
        e.preventDefault()
        push(route)
      }}
    >
      {children}
    </a>
  )
}

const builtOn = (iso: string) => iso.split('-').reverse().join('/')

/** Rodapé do Início: links institucionais, dados da empresa e data da versão. */
export function HomeFooter() {
  const company = companyLine()
  return (
    <footer className="home-footer">
      <nav className="home-footer__links" aria-label="Institucional">
        <RouteLink route={{ screen: 'help', tab: 'contact' }}>Fale com a gente</RouteLink>
        <RouteLink route={{ screen: 'page', page: 'terms' }}>Termos de uso</RouteLink>
        <RouteLink route={{ screen: 'page', page: 'privacy' }}>Política de privacidade</RouteLink>
      </nav>
      {company && <p className="home-footer__company">{company}</p>}
      <p className="home-footer__version">
        Última atualização: {builtOn(__APP_VERSION__)} ·{' '}
        <RouteLink route={{ screen: 'help', tab: 'news' }}>Veja as novidades</RouteLink>
      </p>
    </footer>
  )
}

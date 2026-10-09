import { useMemo, type ReactNode } from 'react'
import { BANNERS, visibleBanners } from '../data/banners'
import { catalogUpdatedOn, quoteTileSummary, settingsPending } from '../domain/home'
import type { AppSettings, Quote } from '../domain/types'
import type { Route } from '../nav/routes'
import { AppHeader, CatalogIcon, GearIcon, HelpIcon, QuotesIcon, type AppSection } from './AppHeader'
import { BannerCarousel } from './BannerCarousel'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function Tile({
  title,
  icon,
  summary,
  label,
  alert,
  disabled,
  onClick,
}: {
  title: string
  icon: ReactNode
  summary?: ReactNode
  /** Accessible name: title plus the summary as plain text. */
  label: string
  alert?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      className={`tile${alert ? ' tile--alert' : ''}`}
      aria-label={label}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
    >
      <span className="tile__icon">{icon}</span>
      {alert && (
        <span className="tile__badge" aria-hidden="true">
          !
        </span>
      )}
      <span className="tile__title">{title}</span>
      {summary && <span className="tile__summary">{summary}</span>}
    </button>
  )
}

export function HomeScreen({
  quotes,
  catalogVersion,
  settings,
  isAdmin,
  onNavigate,
  onOpen,
}: {
  quotes: readonly Quote[]
  catalogVersion: string
  settings: AppSettings
  isAdmin: boolean
  onNavigate: (section: AppSection) => void
  onOpen: (route: Route) => void
}) {
  const banners = useMemo(() => visibleBanners(BANNERS, new Date()), [])
  const summary = useMemo(
    () => quoteTileSummary(quotes, new Date(), settings.quoteValidityDays),
    [quotes, settings.quoteValidityDays],
  )
  const updatedOn = catalogUpdatedOn(catalogVersion)
  const pending = settingsPending(settings).length > 0

  const quoteLines: string[] = []
  if (summary.expiring > 0) quoteLines.push(`${summary.expiring} vencendo`)
  if (summary.drafts > 0) quoteLines.push(plural(summary.drafts, 'rascunho', 'rascunhos'))
  if (quoteLines.length === 0) {
    quoteLines.push(
      summary.total === 0 ? 'Nenhum orçamento ainda' : plural(summary.emitted, 'emitido', 'emitidos'),
    )
  }
  const catalogLine = updatedOn ? `Atualizado em ${updatedOn.toLocaleDateString('pt-BR')}` : undefined

  return (
    <div className="shell home">
      <div className="sticky-head">
        <AppHeader title="Início" current="home" onNavigate={onNavigate} />
      </div>

      <BannerCarousel banners={banners} onRoute={onOpen} />

      <nav className="tile-grid" aria-label="Módulos">
        <Tile
          title="Orçamentos"
          icon={<QuotesIcon />}
          label={`Orçamentos: ${quoteLines.join(', ')}`}
          summary={quoteLines.map((line, i) => (
            <span key={line} className={i === 0 && summary.expiring > 0 ? 'tile__attention' : undefined}>
              {line}
            </span>
          ))}
          onClick={() => onNavigate('list')}
        />
        {isAdmin && (
          <Tile
            title="Catálogo"
            icon={<CatalogIcon />}
            label={catalogLine ? `Catálogo: ${catalogLine}` : 'Catálogo'}
            summary={catalogLine}
            onClick={() => onNavigate('catalog')}
          />
        )}
        {isAdmin && (
          <Tile
            title="Configurações"
            icon={<GearIcon />}
            alert={pending}
            label={pending ? 'Configurações: Complete o cadastro da loja' : 'Configurações'}
            summary={pending ? 'Complete o cadastro da loja' : undefined}
            onClick={() =>
              pending ? onOpen({ screen: 'settings', tab: 'register' }) : onNavigate('settings')
            }
          />
        )}
        <Tile title="Ajuda" icon={<HelpIcon />} label="Ajuda: em breve" summary="Em breve" disabled />
      </nav>
    </div>
  )
}

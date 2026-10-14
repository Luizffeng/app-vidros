import { useMemo, type ReactNode } from 'react'
import { BANNERS, visibleBanners } from '../data/banners'
import { supportWhatsAppUrl } from '../data/support'
import { supportMessage, type SupportIntent } from '../domain/account'
import { catalogUpdatedOn, quoteTileSummary, settingsPending } from '../domain/home'
import type { OnboardingTask } from '../domain/onboarding'
import type { Account, AccountState, AppSettings, Quote } from '../domain/types'
import type { Route } from '../nav/routes'
import { AppHeader, CatalogIcon, GearIcon, HelpIcon, QuotesIcon, type AppSection } from './AppHeader'
import { Banner } from './Banner'
import { BannerCarousel } from './BannerCarousel'
import { HomeFooter } from './HomeFooter'
import { OnboardingCard } from './OnboardingCard'

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

const dayMonth = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''

function AccountBanner({
  account,
  state,
  onTalk,
}: {
  account: Account
  state: AccountState
  onTalk: () => void
}) {
  if (!state.warn && state.kind !== 'expired' && state.kind !== 'disabled') return null
  const subscription = state.reason === 'subscription'
  const talk = (
    <button type="button" className="btn" onClick={onTalk}>
      Falar com a gente
    </button>
  )
  const link = (intent: SupportIntent, label: string) => (
    <a
      className="btn"
      href={supportWhatsAppUrl(supportMessage(intent, account))}
      target="_blank"
      rel="noreferrer"
    >
      {label}
    </a>
  )
  if (state.kind === 'disabled') {
    return (
      <Banner tone="warn" actions={talk}>
        Sua conta está suspensa. Seus orçamentos continuam aqui para consulta.
      </Banner>
    )
  }
  if (state.kind === 'expired') {
    return (
      <Banner tone="warn" actions={talk}>
        {subscription ? 'Sua assinatura venceu' : 'Seu teste grátis terminou'} em {dayMonth(state.endsAt)}.
        Seus orçamentos continuam aqui para consulta.
      </Banner>
    )
  }
  const days = plural(state.daysLeft ?? 0, 'dia', 'dias')
  return subscription ? (
    <Banner tone="warn" actions={link('renew', 'Renovar')}>
      Sua assinatura vence em {days}.
    </Banner>
  ) : (
    <Banner tone="warn" actions={link('subscribe', 'Quero assinar')}>
      Seu teste grátis termina em {days}.
    </Banner>
  )
}

export function HomeScreen({
  quotes,
  catalogVersion,
  settings,
  isAdmin,
  account,
  accountState,
  onboarding,
  onNavigate,
  onOpen,
  onOpenTask,
  onDismissOnboarding,
}: {
  quotes: readonly Quote[]
  catalogVersion: string
  settings: AppSettings
  isAdmin: boolean
  account: Account | null
  accountState: AccountState
  /** Null when the card is hidden */
  onboarding: readonly OnboardingTask[] | null
  onNavigate: (section: AppSection) => void
  onOpen: (route: Route) => void
  onOpenTask: (task: OnboardingTask) => void
  onDismissOnboarding: () => void
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

      {account && <AccountBanner account={account} state={accountState} onTalk={() => onNavigate('help')} />}

      <BannerCarousel banners={banners} onRoute={onOpen} />

      {onboarding && <OnboardingCard tasks={onboarding} onOpen={onOpenTask} onDismiss={onDismissOnboarding} />}

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
        <Tile
          title="Ajuda"
          icon={<HelpIcon />}
          label="Ajuda: Fale com a gente"
          summary="Fale com a gente"
          onClick={() => onNavigate('help')}
        />
      </nav>

      {accountState.kind === 'trial' && !accountState.warn && (
        <p className="muted home__trial">
          Teste grátis: faltam {plural(accountState.daysLeft ?? 0, 'dia', 'dias')}
        </p>
      )}

      <HomeFooter onNavigate={onNavigate} />
    </div>
  )
}

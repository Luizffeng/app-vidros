import { useState, type MouseEvent } from 'react'
import { useAccess } from '../auth/access'
import { companyLine } from '../data/company'
import { push } from '../nav/navigator'
import { formatRoute, type PublicPage } from '../nav/routes'
import { useBackLayer } from '../nav/useBackLayer'
import type { AppSection } from './AppHeader'
import { Banner } from './Banner'
import { ConfirmPop } from './ConfirmPop'

const CONFIRM_WORD = 'EXCLUIR'

function PageLink({ page, children }: { page: PublicPage; children: string }) {
  const route = { screen: 'page', page } as const
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

/** Rodapé do Início: links institucionais, dados da empresa, versão e excluir conta. */
export function HomeFooter({ onNavigate }: { onNavigate: (section: AppSection) => void }) {
  const access = useAccess()
  /** Só o administrador de uma conta na nuvem (o banco recusa os demais). */
  const canDelete = access.role === 'admin' && Boolean(access.signOut)
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const company = companyLine()

  const close = () => {
    setConfirming(false)
    setTyped('')
  }
  useBackLayer(confirming, close)

  const deleteAll = async () => {
    try {
      setBusy(true)
      setError(null)
      await access.accounts.deleteMyAccount()
    } catch {
      setError('Não foi possível excluir agora. Nada foi apagado; tente de novo ou fale com a gente.')
      setBusy(false)
    }
  }

  return (
    <footer className="home-footer">
      <nav className="home-footer__links" aria-label="Institucional">
        <button type="button" className="btn link" onClick={() => onNavigate('help')}>
          Fale com a gente
        </button>
        <PageLink page="news">Novidades</PageLink>
        <PageLink page="terms">Termos de uso</PageLink>
        <PageLink page="privacy">Política de privacidade</PageLink>
      </nav>

      {canDelete && (
        <div className="home-footer__delete">
          <button
            type="button"
            className="btn link home-footer__danger"
            aria-expanded={confirming}
            onClick={() => (confirming ? close() : setConfirming(true))}
          >
            Excluir minha conta e dados
          </button>
          <ConfirmPop
            open={confirming}
            place="static"
            block
            label="Excluir conta"
            message={
              <>
                Apaga a conta, os orçamentos, o catálogo e o logo. Não dá para desfazer.
                <label className="home-footer__confirm">
                  Digite {CONFIRM_WORD} para confirmar
                  <input
                    value={typed}
                    autoCapitalize="characters"
                    autoComplete="off"
                    onChange={(e) => setTyped(e.target.value)}
                  />
                </label>
              </>
            }
            yesLabel={busy ? 'Excluindo…' : 'Excluir tudo'}
            noLabel="Cancelar"
            busy={busy || typed.trim().toUpperCase() !== CONFIRM_WORD}
            onYes={() => void deleteAll()}
            onNo={close}
          />
          {error && <Banner tone="error">{error}</Banner>}
        </div>
      )}

      {company && <p className="home-footer__company">{company}</p>}
      <p className="home-footer__version">Versão {__APP_VERSION__}</p>
    </footer>
  )
}

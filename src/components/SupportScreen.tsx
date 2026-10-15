import { useEffect, useState, type ReactNode } from 'react'
import { useAccess } from '../auth/access'
import { SUPPORT, supportWhatsAppUrl } from '../data/support'
import { anyTipSeen, resetTips, TIPS } from '../data/tips'
import { parseMarkdown, splitChapters, type Block } from '../content/markdown'
import { PAGE_SOURCES } from '../content/pages'
import { supportMessage } from '../domain/account'
import type { Suggestion } from '../domain/types'
import { up } from '../nav/navigator'
import type { HelpTab } from '../nav/routes'
import { useLeaveGuard } from '../nav/useLeaveGuard'
import { AppHeader, type AppSection } from './AppHeader'
import { Banner } from './Banner'
import { CollapsibleSection } from './CollapsibleSection'
import { BlockView, InlineText } from './PublicPage'
import { Section } from './Section'
import { Tabs } from './Tabs'

const HELP_TABS: { id: HelpTab; label: string }[] = [
  { id: 'contact', label: 'Fale com a gente' },
  { id: 'tips', label: 'Dicas' },
  { id: 'news', label: 'Novidades' },
]

/** One card per month, newest open. `src/content/novidades.md` keeps the last 6 months. */
const NEWS = splitChapters(parseMarkdown(PAGE_SOURCES.news))
const NEWS_MONTHS = 6

const itemCount = (blocks: readonly Block[]) =>
  blocks.reduce((n, b) => n + (b.kind === 'list' ? b.items.length : 0), 0)

const MIN_LENGTH = 3
const MAX_LENGTH = 2000

const dateBr = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

function statusLabel(s: Suggestion): string {
  if (s.status === 'feita') return s.shippedVersion ? `Feita na versão ${s.shippedVersion}` : 'Feita'
  return s.status === 'respondida' ? 'Respondida' : 'Recebida'
}

/** /suporte: abas Fale com a gente (WhatsApp e sugestões), Dicas e Novidades. Funciona com a conta vencida. */
export function SupportScreen({
  tab,
  onTabChange,
  onNavigate,
  nextStep,
}: {
  tab: HelpTab
  onTabChange: (tab: HelpTab) => void
  onNavigate: (section: AppSection) => void
  nextStep?: ReactNode
}) {
  const { account, accounts } = useAccess()
  const [list, setList] = useState<Suggestion[] | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tipsSeen, setTipsSeen] = useState(anyTipSeen)
  const [tipsBack, setTipsBack] = useState(false)

  useLeaveGuard(text.trim() !== '', 'Descartar a sugestão que você escreveu?')

  useEffect(() => {
    let alive = true
    accounts
      .listSuggestions()
      .then((rows) => alive && setList(rows))
      .catch(() => alive && setList([]))
    return () => {
      alive = false
    }
  }, [accounts])

  const send = async () => {
    try {
      setBusy(true)
      setError(null)
      setSent(false)
      await accounts.sendSuggestion(text)
      setText('')
      setSent(true)
      setList(await accounts.listSuggestions())
    } catch {
      setError('Não foi possível enviar agora. Seu texto continua aqui; tente de novo em instantes.')
    } finally {
      setBusy(false)
    }
  }

  const talkUrl = supportWhatsAppUrl(account ? supportMessage('talk', account) : 'Olá!')

  return (
    <div className="shell support">
      <div className="sticky-head">
        <AppHeader title="Suporte" current="help" onNavigate={onNavigate} onBack={up} />
        <Tabs label="Seções do suporte" idPrefix="help" tabs={HELP_TABS} current={tab} onChange={onTabChange} />
      </div>

      {nextStep}
      {tab === 'contact' && (
        <div className="tab-panel" role="tabpanel" id="help-panel-contact" aria-labelledby="help-tab-contact">
          <Section title="WhatsApp" hint={`${SUPPORT.hours}. ${SUPPORT.reply}`}>
            <a className="btn primary support__whatsapp" href={talkUrl} target="_blank" rel="noreferrer">
              Conversar no WhatsApp
            </a>
          </Section>
          <Section title="Sugestões" count={list && list.length > 0 ? list.length : undefined}>
            {error && <Banner tone="error">{error}</Banner>}
            {sent && !error && <Banner tone="ok">Recebemos sua sugestão. Obrigado!</Banner>}
            <label className="support__field">
              O que faria o app melhor para você?
              <textarea
                rows={3}
                maxLength={MAX_LENGTH}
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  setSent(false)
                }}
              />
            </label>
            <button
              type="button"
              className="btn primary support__send"
              disabled={busy || text.trim().length < MIN_LENGTH}
              onClick={() => void send()}
            >
              {busy ? 'Enviando…' : 'Enviar'}
            </button>
            {!busy && text.trim().length < MIN_LENGTH && (
              <p className="btn-reason">Escreva pelo menos {MIN_LENGTH} letras para enviar.</p>
            )}

            {list && list.length > 0 && (
              <ul className="suggestions">
                {list.map((s) => (
                  <li key={s.id} className="suggestions__item">
                    <div className="suggestions__head">
                      <span className="muted">{dateBr(s.createdAt)}</span>
                      <span className={`status-pill status-pill--${s.status === 'recebida' ? 'draft' : 'emitted'}`}>
                        {statusLabel(s)}
                      </span>
                    </div>
                    <p className="suggestions__body">{s.body}</p>
                    {s.reply && <blockquote className="suggestions__reply">{s.reply}</blockquote>}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}

      {tab === 'tips' && (
        <div className="tab-panel" role="tabpanel" id="help-panel-tips" aria-labelledby="help-tab-tips">
          {Object.values(TIPS).map((tip) => (
            <CollapsibleSection key={tip.title} title={tip.title}>
              <p className="tip-help">{tip.help}</p>
            </CollapsibleSection>
          ))}
          {(tipsSeen || tipsBack) && (
            <Section title="Dicas no orçamento" hint="Cada dica aparece uma vez, ao lado do botão que ela explica.">
              {tipsSeen ? (
                <button
                  type="button"
                  className="btn support__send"
                  onClick={() => {
                    resetTips()
                    setTipsSeen(false)
                    setTipsBack(true)
                  }}
                >
                  Mostrar as dicas de novo
                </button>
              ) : (
                <p className="muted">Pronto: as dicas voltam a aparecer no orçamento.</p>
              )}
            </Section>
          )}
        </div>
      )}

      {tab === 'news' && (
        <div className="tab-panel support__news" role="tabpanel" id="help-panel-news" aria-labelledby="help-tab-news">
          <div className="doc__body support__news-intro">
            {NEWS.intro.map((block, i) => (
              <BlockView key={i} block={block} />
            ))}
          </div>
          {NEWS.chapters.slice(0, NEWS_MONTHS).map((month, i) => (
            <CollapsibleSection
              key={i}
              title={<InlineText parts={month.title} />}
              count={itemCount(month.blocks) || undefined}
              defaultOpen={i === 0}
            >
              <div className="doc__body">
                {month.blocks.map((block, j) => (
                  <BlockView key={j} block={block} />
                ))}
              </div>
            </CollapsibleSection>
          ))}
        </div>
      )}
    </div>
  )
}

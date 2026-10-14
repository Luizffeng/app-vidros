import { useEffect, useState } from 'react'
import { useAccess } from '../auth/access'
import { SUPPORT, supportWhatsAppUrl } from '../data/support'
import { supportMessage } from '../domain/account'
import type { Suggestion } from '../domain/types'
import { up } from '../nav/navigator'
import { useLeaveGuard } from '../nav/useLeaveGuard'
import { AppHeader, type AppSection } from './AppHeader'
import { Banner } from './Banner'
import { Section } from './Section'

const MIN_LENGTH = 3
const MAX_LENGTH = 2000

const dateBr = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

function statusLabel(s: Suggestion): string {
  if (s.status === 'feita') return s.shippedVersion ? `Feita na versão ${s.shippedVersion}` : 'Feita'
  return s.status === 'respondida' ? 'Respondida' : 'Recebida'
}

/** /ajuda: WhatsApp e sugestões. Funciona com a conta vencida. */
export function SupportScreen({ onNavigate }: { onNavigate: (section: AppSection) => void }) {
  const { account, accounts } = useAccess()
  const [list, setList] = useState<Suggestion[] | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        <AppHeader title="Ajuda" current="help" onNavigate={onNavigate} onBack={up} />
      </div>

      <Section title="Fale com a gente" hint={`${SUPPORT.hours}. ${SUPPORT.reply}`}>
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
  )
}

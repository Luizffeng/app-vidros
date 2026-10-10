import { useState, type FormEvent } from 'react'
import { formatPhone, phoneDigits } from '../domain/brazil'
import type { AccountService } from '../domain/types'
import { Banner } from './Banner'
import { LegalLinks } from './EntryScreen'

/** Login sem vidraçaria: cria a conta e começa o teste. */
export function AccountSetupScreen({
  accounts,
  onCreated,
  onSignOut,
}: {
  accounts: AccountService
  onCreated: () => Promise<void>
  onSignOut: () => void
}) {
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [optIn, setOptIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const phoneOk = whatsapp.length >= 10

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!phoneOk) {
      setError('Informe o WhatsApp com DDD.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await accounts.createAccount({ name: name.trim(), whatsapp, marketingOptIn: optIn })
      await onCreated()
    } catch (e) {
      const message = e instanceof Error ? e.message : ''
      if (/já existe/.test(message)) return void (await onCreated())
      setError(/WhatsApp/.test(message) ? 'Informe o WhatsApp com DDD.' : 'Não foi possível criar a conta. Tente de novo.')
      setBusy(false)
    }
  }

  return (
    <div className="shell entry">
      <header className="topbar">
        <div>
          <p className="brand-sm">App Vidros</p>
          <h1 className="title-sm">Sua vidraçaria</h1>
        </div>
      </header>
      <form className="login-form" onSubmit={(event) => void onSubmit(event)}>
        <label>
          Nome da vidraçaria
          <input
            autoComplete="organization"
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label>
          WhatsApp da loja
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="(00) 00000-0000"
            aria-invalid={whatsapp.length > 0 && !phoneOk}
            value={formatPhone(whatsapp)}
            onChange={(event) => setWhatsapp(phoneDigits(event.target.value))}
            required
          />
        </label>
        <label className="check-field__box check-field__box--row">
          <span>Quero receber novidades e ofertas pelo WhatsApp</span>
          <input type="checkbox" checked={optIn} onChange={(event) => setOptIn(event.target.checked)} />
        </label>
        <p className="muted">Ao continuar, você aceita os Termos de uso e a Política de privacidade.</p>
        {error && <Banner tone="error">{error}</Banner>}
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? 'Criando…' : 'Começar teste grátis de 30 dias'}
        </button>
      </form>
      <LegalLinks />
      <div className="entry__switch">
        <button type="button" className="btn ghost" onClick={onSignOut}>
          Sair
        </button>
      </div>
    </div>
  )
}

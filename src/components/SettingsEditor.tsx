import { useMemo, useRef, useState } from 'react'
import type { AppSettings, EstablishmentInfo } from '../domain/types'
import { DEFAULT_LOGO_DATA_URL } from '../data/defaultLogo'
import { normalizeSettings } from '../data/defaultSettings'
import { fileToLogoDataUrl } from '../data/logo'
import { digitsOnly, formatCep, lookupCep } from '../data/viacep'
import { AppNav, type AppSection } from './AppNav'

export function SettingsEditor({
  settings,
  onSave,
  onNavigate,
}: {
  settings: AppSettings
  onSave: (settings: AppSettings) => Promise<void>
  onNavigate: (section: AppSection) => void
}) {
  const [draft, setDraft] = useState(() => normalizeSettings(settings))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [cepMessage, setCepMessage] = useState<string | null>(null)
  const [logoBusy, setLogoBusy] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(normalizeSettings(settings)),
    [draft, settings],
  )

  const setEst = (patch: Partial<EstablishmentInfo>) => {
    setDraft((d) => ({
      ...d,
      establishment: { ...d.establishment, ...patch },
    }))
  }

  const applyCep = async (cepDigits: string) => {
    if (cepDigits.length !== 8) return
    setCepStatus('loading')
    setCepMessage('Buscando CEP…')
    try {
      const data = await lookupCep(cepDigits)
      if (!data) {
        setCepStatus('error')
        setCepMessage('CEP não encontrado.')
        return
      }
      setDraft((d) => ({
        ...d,
        establishment: {
          ...d.establishment,
          cep: cepDigits,
          street: data.logradouro || d.establishment.street,
          neighborhood: data.bairro || d.establishment.neighborhood,
          city: data.localidade || d.establishment.city,
          state: data.uf || d.establishment.state,
          complement: data.complemento || d.establishment.complement,
        },
      }))
      setCepStatus('ok')
      setCepMessage('Endereço preenchido. Confira o número.')
    } catch {
      setCepStatus('error')
      setCepMessage('Não foi possível consultar o CEP.')
    }
  }

  const save = async () => {
    try {
      setBusy(true)
      setError(null)
      const next = normalizeSettings(draft)
      await onSave(next)
      setDraft(next)
      setMessage('Configurações salvas.')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const onLogoPick = async (file: File | undefined) => {
    if (!file) return
    try {
      setLogoBusy(true)
      setError(null)
      const dataUrl = await fileToLogoDataUrl(file)
      setDraft((d) => ({ ...d, logoDataUrl: dataUrl }))
      setMessage('Logo carregada — salve as configurações.')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLogoBusy(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const est = draft.establishment

  return (
    <div className="shell shell--wide">
      <header className="topbar">
        <div>
          <p className="brand-sm">App Vidros</p>
          <h1 className="title-sm">Configurações</h1>
        </div>
      </header>

      <AppNav current="settings" onNavigate={onNavigate} />

      <p className="lede catalog-lede">
        Dados do estabelecimento e regras do orçamento. Aparecem no PDF do cliente.
      </p>

      {error && <div className="banner error">{error}</div>}
      {message && !error && <div className="banner ok">{message}</div>}

      <section className="section">
        <h2>Logo</h2>
        <div className="logo-row">
          <div className="logo-preview">
            {draft.logoDataUrl ? (
              <img src={draft.logoDataUrl} alt="Logo do estabelecimento" />
            ) : (
              <span className="muted">Sem logo</span>
            )}
          </div>
          <div className="logo-actions">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(e) => void onLogoPick(e.target.files?.[0])}
            />
            <button
              type="button"
              className="btn"
              disabled={logoBusy || busy}
              onClick={() => logoInputRef.current?.click()}
            >
              {logoBusy ? 'Processando…' : draft.logoDataUrl ? 'Trocar logo' : 'Enviar logo'}
            </button>
            {draft.logoDataUrl && draft.logoDataUrl !== DEFAULT_LOGO_DATA_URL && (
              <button
                type="button"
                className="btn danger"
                disabled={busy}
                onClick={() => {
                  setDraft((d) => ({ ...d, logoDataUrl: DEFAULT_LOGO_DATA_URL }))
                  setMessage('Logo padrão restaurada — salve as configurações.')
                }}
              >
                Restaurar padrão
              </button>
            )}
            <p className="muted catalog-hint">
              PNG, JPEG ou WebP · até 5 MB · redimensionada automaticamente.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Orçamento</h2>
        <label className="settings-field">
          Validade padrão (dias)
          <input
            className="settings-days"
            inputMode="numeric"
            value={String(draft.quoteValidityDays)}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/\D/g, ''))
              setDraft((d) => ({
                ...d,
                quoteValidityDays: Number.isFinite(n) && n >= 1 ? Math.min(n, 3650) : d.quoteValidityDays,
              }))
            }}
          />
        </label>
        <p className="field-hint">Data do orçamento + N dias. Gravada na emissão.</p>
        <label className="settings-field">
          Chamada no WhatsApp
          <textarea
            rows={2}
            maxLength={180}
            value={draft.shareCta}
            onChange={(e) => setDraft((d) => ({ ...d, shareCta: e.target.value }))}
          />
        </label>
        <p className="field-hint">
          Última linha da mensagem. Vazio, a linha sai do WhatsApp.
        </p>
      </section>

      <section className="section">
        <h2>Estabelecimento</h2>
        <div className="grid">
          <label className="full">
            Nome / razão social
            <input
              value={est.name}
              onChange={(e) => setEst({ name: e.target.value })}
            />
          </label>
          <label className="full">
            Nome fantasia
            <input
              value={est.tradeName ?? ''}
              onChange={(e) => setEst({ tradeName: e.target.value })}
            />
          </label>
          <label>
            CNPJ / CPF
            <input
              inputMode="numeric"
              value={est.document ?? ''}
              onChange={(e) => setEst({ document: digitsOnly(e.target.value, 14) })}
            />
          </label>
          <label>
            Telefone
            <input
              inputMode="numeric"
              value={est.phone ?? ''}
              onChange={(e) => setEst({ phone: digitsOnly(e.target.value) })}
            />
          </label>
          <label className="full">
            E-mail
            <input
              type="email"
              autoComplete="email"
              value={est.email ?? ''}
              onChange={(e) => setEst({ email: e.target.value })}
            />
          </label>
          <label>
            CEP
            <input
              inputMode="numeric"
              placeholder="00000-000"
              value={formatCep(est.cep ?? '')}
              onChange={(e) => {
                const cep = digitsOnly(e.target.value, 8)
                setEst({ cep })
                setCepStatus('idle')
                setCepMessage(null)
                if (cep.length === 8) void applyCep(cep)
              }}
            />
          </label>
          <label>
            UF
            <input
              maxLength={2}
              value={est.state ?? ''}
              onChange={(e) =>
                setEst({
                  state: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2),
                })
              }
            />
          </label>
          <label className="full">
            Rua / logradouro
            <input
              value={est.street ?? ''}
              onChange={(e) => setEst({ street: e.target.value })}
            />
          </label>
          <label>
            Número
            <input
              value={est.number ?? ''}
              onChange={(e) => setEst({ number: e.target.value })}
            />
          </label>
          <label>
            Complemento
            <input
              value={est.complement ?? ''}
              onChange={(e) => setEst({ complement: e.target.value })}
            />
          </label>
          <label>
            Bairro
            <input
              value={est.neighborhood ?? ''}
              onChange={(e) => setEst({ neighborhood: e.target.value })}
            />
          </label>
          <label>
            Cidade
            <input
              value={est.city ?? ''}
              onChange={(e) => setEst({ city: e.target.value })}
            />
          </label>
        </div>
        {cepMessage && (
          <p className={`cep-status${cepStatus === 'error' ? ' cep-status--error' : ''}`}>
            {cepStatus === 'loading' ? 'Buscando CEP…' : cepMessage}
          </p>
        )}
      </section>

      <footer className="actions actions--row">
        <button type="button" className="btn ghost" onClick={() => onNavigate('list')}>
          Voltar
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={busy || !dirty}
          onClick={() => void save()}
        >
          {busy ? 'Salvando…' : dirty ? 'Salvar configurações' : 'Salvo'}
        </button>
      </footer>
    </div>
  )
}

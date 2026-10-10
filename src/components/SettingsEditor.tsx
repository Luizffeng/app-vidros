import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { AppSettings, EstablishmentInfo, MarginMode } from '../domain/types'
import { DEFAULT_LOGO_DATA_URL } from '../data/defaultLogo'
import { normalizeSettings } from '../data/defaultSettings'
import { fileToLogoDataUrl } from '../data/logo'
import { digitsOnly, formatCep, lookupCep } from '../data/viacep'
import { filterUfInput, formatPhone, isValidUf, phoneDdd, phoneDigits } from '../domain/brazil'
import { up } from '../nav/navigator'
import type { SettingsTab } from '../nav/routes'
import { useLeaveGuard } from '../nav/useLeaveGuard'
import { AppHeader, type AppSection } from './AppHeader'
import { Banner } from './Banner'
import { CollapsibleSection } from './CollapsibleSection'
import { Section } from './Section'
import { useDismiss } from './useDismiss'
import { ConfirmPop } from './ConfirmPop'

const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: 'register', label: 'Cadastro' },
  { id: 'quote', label: 'Orçamento' },
  { id: 'logo', label: 'Logo' },
]

const MARGIN_MODES: { id: MarginMode; name: string; description: string }[] = [
  {
    id: 'empresa',
    name: 'Empresa',
    description: 'Margem sobre material, adicionais do item e mão de obra.',
  },
  {
    id: 'vendedor',
    name: 'Vendedor',
    description: 'Margem sobre material e adicionais do item. Mão de obra sem margem.',
  },
  {
    id: 'autonomo',
    name: 'Autônomo',
    description: 'Sem margem sobre os itens. A mão de obra é o lucro.',
  },
]

export function SettingsEditor({
  settings,
  tab,
  onTabChange,
  onSave,
  onNavigate,
}: {
  settings: AppSettings
  tab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
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
  const tabsRef = useRef<HTMLDivElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    const list = tabsRef.current
    if (!list) return
    const place = () => {
      const selected = list.querySelector<HTMLElement>('[aria-selected="true"]')
      if (!selected) return
      list.style.setProperty('--tab-x', `${selected.offsetLeft}px`)
      list.style.setProperty('--tab-w', `${selected.offsetWidth}px`)
      if (!list.dataset.ready) {
        // Commit the first position before enabling the transition, so it does not slide in from 0.
        void list.offsetWidth
        list.dataset.ready = ''
      }
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(list)
    return () => observer.disconnect()
  }, [tab])
  const [confirmMode, setConfirmMode] = useState(false)
  const saveWrapRef = useRef<HTMLDivElement>(null)
  useDismiss(confirmMode, saveWrapRef, () => setConfirmMode(false))

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(normalizeSettings(settings)),
    [draft, settings],
  )
  useLeaveGuard(dirty)

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

  const requestSave = () => {
    if (draft.marginMode !== normalizeSettings(settings).marginMode) {
      setConfirmMode(true)
      return
    }
    void save()
  }

  const save = async () => {
    setConfirmMode(false)
    try {
      setBusy(true)
      setError(null)
      const next = normalizeSettings(draft)
      if (next.marginMode !== normalizeSettings(settings).marginMode) {
        next.marginModeChangedAt = new Date().toISOString()
      }
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
    <div className="shell shell--wide shell--with-bar">
      <div className="sticky-head">
        <AppHeader title="Configurações" current="settings" onNavigate={onNavigate} onBack={up} />

        <div className="tabs" role="tablist" aria-label="Seções das configurações" ref={tabsRef}>
          <span className="tabs__indicator" aria-hidden="true" />
          {SETTINGS_TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`settings-tab-${id}`}
              className="tabs__tab"
              aria-selected={tab === id}
              aria-controls={`settings-panel-${id}`}
              onClick={() => onTabChange(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <Banner tone="error">{error}</Banner>}
      {message && !error && <Banner tone="ok">{message}</Banner>}

      {tab === 'register' && (
        <div className="tab-panel" role="tabpanel" id="settings-panel-register" aria-labelledby="settings-tab-register">
          <CollapsibleSection title="Estabelecimento" defaultOpen>
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
                  type="tel"
                  inputMode="numeric"
                  placeholder="(00) 00000-0000"
                  aria-invalid={Boolean(est.phone) && !phoneDdd(est.phone)}
                  value={formatPhone(est.phone)}
                  onChange={(e) => setEst({ phone: phoneDigits(e.target.value) })}
                />
                <span className="field-hint">Com DDD. Completa telefones de clientes sem DDD.</span>
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
              <div className="field-pair field-pair--cep full">
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
                    autoCapitalize="characters"
                    value={est.state ?? ''}
                    onChange={(e) => setEst({ state: filterUfInput(e.target.value, est.state) })}
                    onBlur={(e) => {
                      if (e.currentTarget.value && !isValidUf(e.currentTarget.value)) setEst({ state: '' })
                    }}
                  />
                </label>
              </div>
              <label className="full">
                Rua / logradouro
                <input
                  value={est.street ?? ''}
                  onChange={(e) => setEst({ street: e.target.value })}
                />
              </label>
              <div className="field-pair field-pair--number full">
                <label>
                  Número
                  <input
                    inputMode="numeric"
                    value={est.number ?? ''}
                    onChange={(e) => setEst({ number: digitsOnly(e.target.value, 6) })}
                  />
                </label>
                <label>
                  Complemento
                  <input
                    value={est.complement ?? ''}
                    onChange={(e) => setEst({ complement: e.target.value })}
                  />
                </label>
              </div>
              <div className="field-pair field-pair--city full">
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
            </div>
            {cepMessage && (
              <p className={`cep-status${cepStatus === 'error' ? ' cep-status--error' : ''}`}>
                {cepStatus === 'loading' ? 'Buscando CEP…' : cepMessage}
              </p>
            )}
          </CollapsibleSection>
        </div>
      )}

      {tab === 'quote' && (
        <div className="tab-panel" role="tabpanel" id="settings-panel-quote" aria-labelledby="settings-tab-quote">
          <Section title="Cálculo de margem">
            <fieldset className="margin-modes" aria-label="Cálculo de margem">
              {MARGIN_MODES.map((mode) => (
                <label key={mode.id} className="margin-mode">
                  <span className="margin-mode__text">
                    <span className="margin-mode__name">{mode.name}</span>
                    <span className="margin-mode__desc">{mode.description}</span>
                  </span>
                  <input
                    type="radio"
                    name="margin-mode"
                    className="margin-mode__box"
                    checked={draft.marginMode === mode.id}
                    onChange={() => setDraft((d) => ({ ...d, marginMode: mode.id }))}
                  />
                </label>
              ))}
            </fieldset>
          </Section>
          <Section title="Validade padrão" hint="Data do orçamento + N dias. Gravada na emissão.">
            <label className="inline-field">
              Dias
              <input
                className="settings-days"
                inputMode="numeric"
                maxLength={4}
                data-select-all
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
          </Section>
          <Section title="Texto final no WhatsApp" hint="Última linha da mensagem, antes da validade.">
            <textarea
              className="settings-cta"
              rows={2}
              maxLength={180}
              aria-label="Texto final no WhatsApp"
              value={draft.shareCta}
              onChange={(e) => setDraft((d) => ({ ...d, shareCta: e.target.value }))}
            />
          </Section>
        </div>
      )}

      {tab === 'logo' && (
        <Section
          title="Logo"
          className="tab-panel"
          role="tabpanel"
          id="settings-panel-logo"
          aria-labelledby="settings-tab-logo"
        >
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
                Aparece no PDF do orçamento. Até 5 MB.
              </p>
            </div>
          </div>
        </Section>
      )}

      <footer className="action-bar">
        <div className="action-bar__inner action-bar__inner--pair">
          <button type="button" className="btn" onClick={up}>
            Voltar
          </button>
          <div className="emit-wrap" ref={saveWrapRef}>
            <button
              type="button"
              className="btn primary"
              disabled={busy || !dirty}
              onClick={requestSave}
            >
              {busy ? 'Salvando…' : dirty ? 'Salvar' : 'Salvo'}
            </button>
            <ConfirmPop
              open={confirmMode}
              place="above"
              block
              alert
              label="Confirmar cálculo de margem"
              message="Novos orçamentos passam a usar este cálculo. Rascunhos mostram um aviso para atualizar. Orçamentos emitidos não mudam."
              onYes={() => void save()}
              onNo={() => setConfirmMode(false)}
            />
          </div>
        </div>
      </footer>
    </div>
  )
}

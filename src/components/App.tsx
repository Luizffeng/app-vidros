import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type {
  AdditionalCost,
  AppSettings,
  Catalog,
  CustomerInfo,
  ItemInput,
  Quote,
} from '../domain/types'
import {
  addItem,
  createEmptyDraft,
  createRevision,
  emitQuote,
  ensureFreightCost,
  formatBrl,
  formatQuoteCode,
  isFreightCost,
  recomputeTotals,
  removeItem,
  setAdditionalCosts,
  setCustomer,
  updateItem,
} from '../domain/quote'
import { createRepository } from '../data/repository'
import { digitsOnly, formatCep, lookupCep } from '../data/viacep'
import { generateQuotePdf, shareOrDownloadPdf } from '../pdf/generateQuotePdf'
import { CatalogEditor } from './CatalogEditor'
import { AppNav, type AppSection } from './AppNav'
import { ItemForm } from './ItemForm'
import { SettingsEditor } from './SettingsEditor'

const repo = createRepository()

type View = 'list' | 'editor' | 'catalog' | 'settings'

export function App() {
  const [view, setView] = useState<View>('list')
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [listQuery, setListQuery] = useState('')

  const refresh = async () => {
    const [c, list, s] = await Promise.all([
      repo.getCatalog(),
      repo.listQuotes(),
      repo.getSettings(),
    ])
    setCatalog(c)
    setQuotes(list)
    setSettings(s)
  }

  useEffect(() => {
    void refresh().catch((e) => setError(String(e)))
  }, [])

  const filteredQuotes = useMemo(() => {
    const q = listQuery.trim().toLowerCase()
    if (!q) return quotes
    return quotes.filter((quoteRow) => {
      const hay = [
        formatQuoteCode(quoteRow.number, quoteRow.revision),
        quoteRow.number,
        quoteRow.customer.name,
        quoteRow.customer.phone,
        quoteRow.customer.city,
        quoteRow.status === 'emitted' ? 'emitido' : 'rascunho',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [quotes, listQuery])

  const openNew = async () => {
    if (!catalog) return
    const number = await repo.nextQuoteNumber()
    const draft = createEmptyDraft(number, catalog.config.version)
    setEditingItemId(null)
    setQuote(draft)
    setView('editor')
    setError(null)
  }

  const openQuote = async (id: string) => {
    const q = await repo.getQuote(id)
    if (!q) return
    setEditingItemId(null)
    if (q.status === 'draft') {
      const costs = ensureFreightCost(q.additionalCosts)
      if (costs !== q.additionalCosts) {
        const next = recomputeTotals({ ...q, additionalCosts: costs })
        await repo.saveQuote(next)
        setQuote(next)
        setView('editor')
        await refresh()
        return
      }
    }
    setQuote(q)
    setView('editor')
  }

  const persist = async (q: Quote) => {
    await repo.saveQuote(q)
    setQuote(q)
    await refresh()
  }

  const onAddItem = async (input: ItemInput) => {
    if (!quote || !catalog) return
    try {
      const next = addItem(quote, catalog, input)
      await persist(next)
      setEditingItemId(null)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const onUpdateItem = async (itemId: string, input: ItemInput) => {
    if (!quote || !catalog) return
    try {
      const next = updateItem(quote, catalog, itemId, input)
      await persist(next)
      setEditingItemId(null)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const onRemoveItem = async (itemId: string) => {
    if (!quote) return
    if (editingItemId === itemId) setEditingItemId(null)
    await persist(removeItem(quote, itemId))
  }

  const onCustomer = async (customer: CustomerInfo) => {
    if (!quote) return
    await persist(setCustomer(quote, customer))
  }

  const onCosts = async (costs: AdditionalCost[]) => {
    if (!quote) return
    await persist(setAdditionalCosts(quote, costs))
  }

  const onEmit = async () => {
    if (!quote) return
    try {
      setBusy(true)
      const validityDays = settings?.quoteValidityDays ?? 15
      const emitted = emitQuote(quote, validityDays)
      await persist(emitted)
      const blob = await generateQuotePdf(emitted, {
        validityDays,
        settings: settings ?? undefined,
      })
      await shareOrDownloadPdf(
        blob,
        `${formatQuoteCode(emitted.number, emitted.revision)}.pdf`,
      )
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const onPdf = async () => {
    if (!quote) return
    const blob = await generateQuotePdf(quote, {
      validityDays: settings?.quoteValidityDays ?? 15,
      settings: settings ?? undefined,
    })
    await shareOrDownloadPdf(
      blob,
      `${formatQuoteCode(quote.number, quote.revision)}.pdf`,
    )
  }

  const onSaveSettings = async (next: AppSettings) => {
    await repo.saveSettings(next)
    setSettings(next)
  }

  const onRevise = async () => {
    if (!quote) return
    const rev = createRevision(quote)
    await persist(rev)
    setQuote(rev)
  }

  const onSaveCatalog = async (next: Catalog) => {
    await repo.saveCatalog(next)
    setCatalog(next)
  }

  if (!catalog || !settings) {
    return (
      <div className="shell">
        <p className="muted">Carregando…</p>
      </div>
    )
  }

  const goSection = (section: AppSection) => {
    setView(section)
    if (section === 'list') void refresh()
  }

  if (view === 'catalog') {
    return (
      <CatalogEditor
        catalog={catalog}
        onSave={onSaveCatalog}
        onNavigate={goSection}
      />
    )
  }

  if (view === 'settings') {
    return (
      <SettingsEditor
        settings={settings}
        onSave={onSaveSettings}
        onNavigate={goSection}
      />
    )
  }

  if (view === 'list') {
    return (
      <div className="shell">
        <header className="topbar">
          <div>
            <p className="brand-sm">
              {settings.establishment.tradeName ||
                settings.establishment.name ||
                'Forte Vidros'}
            </p>
            <h1 className="title-sm">Orçamentos</h1>
          </div>
        </header>

        <AppNav current="list" onNavigate={goSection} />

        <section className="section">
          <div className="section-head section-head--actions">
            <div className="section-head__title">
              <h2>Recentes</h2>
              <span className="pill">{filteredQuotes.length}</span>
            </div>
            <button type="button" className="btn primary" onClick={() => void openNew()}>
              Novo orçamento
            </button>
          </div>
          {quotes.length > 0 && (
            <div className="list-filters">
              <input
                className="list-search"
                placeholder="Buscar código, cliente, telefone…"
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
              />
            </div>
          )}
          {quotes.length === 0 ? (
            <p className="muted">Nenhum orçamento ainda.</p>
          ) : filteredQuotes.length === 0 ? (
            <p className="muted">Nenhum orçamento na busca.</p>
          ) : (
            <ul className="quote-list">
              {filteredQuotes.map((q) => (
                <li key={q.id}>
                  <button type="button" className="quote-card" onClick={() => void openQuote(q.id)}>
                    <span className="quote-card__title">
                      {formatQuoteCode(q.number, q.revision)}
                    </span>
                    <span className="quote-card__meta">
                      {q.customer.name || 'Sem cliente'} · {q.status === 'emitted' ? 'Emitido' : 'Rascunho'}
                    </span>
                    <span className="quote-card__total">{formatBrl(q.grandTotal)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    )
  }

  if (!quote) return null

  const readOnly = quote.status === 'emitted'
  const editingItem = editingItemId
    ? quote.items.find((i) => i.id === editingItemId)
    : undefined

  return (
    <div className="shell">
      <header className="topbar">
        <button type="button" className="btn ghost" onClick={() => { setView('list'); void refresh() }}>
          ← Orçamentos
        </button>
        <div className="topbar__titles">
          <p className="brand-sm">Forte Vidros</p>
          <h1 className="title-sm title-sm--quote">
            {formatQuoteCode(quote.number, quote.revision)}
          </h1>
        </div>
      </header>

      {error && <div className="banner error">{error}</div>}

      <CustomerSection
        customer={quote.customer}
        disabled={readOnly}
        onChange={(c) => void onCustomer(c)}
      />

      <CollapsibleSection
        title="Itens"
        badge={<span className="pill">{quote.items.length}</span>}
        defaultOpen
      >
        {quote.items.map((item) => (
          <article
            key={item.id}
            className={`item-block${editingItemId === item.id ? ' item-block--editing' : ''}`}
          >
            <div className="item-block__head">
              <strong>{item.result.label}</strong>
              <span>{formatBrl(item.result.breakdown.finalPrice)}</span>
            </div>
            <details>
              <summary>Detalhes do custo</summary>
              <ul className="breakdown">
                <li>
                  <span>Mão de obra</span>
                  <span>{formatBrl(item.result.breakdown.labor)}</span>
                </li>
                <li>
                  <span>Vidros</span>
                  <span>{formatBrl(item.result.breakdown.glass)}</span>
                </li>
                <li>
                  <span>Alumínios</span>
                  <span>{formatBrl(item.result.breakdown.aluminum)}</span>
                </li>
                <li>
                  <span>Ferragens</span>
                  <span>{formatBrl(item.result.breakdown.hardware)}</span>
                </li>
                <li>
                  <span>Acessórios</span>
                  <span>{formatBrl(item.result.breakdown.accessories)}</span>
                </li>
                <li>
                  <span>Adicionais do item</span>
                  <span>{formatBrl(item.result.breakdown.extras)}</span>
                </li>
                <li>
                  <span>Custo</span>
                  <span>{formatBrl(item.result.breakdown.totalCost)}</span>
                </li>
                <li>
                  <span>Margem ({(item.result.breakdown.markup * 100).toFixed(0)}%)</span>
                  <span>{formatBrl(item.result.breakdown.marginAmount)}</span>
                </li>
              </ul>
            </details>
            {!readOnly && (
              <div className="item-block__actions">
                <button
                  type="button"
                  className="btn link btn-edit"
                  onClick={() => setEditingItemId(item.id)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn danger link"
                  onClick={() => void onRemoveItem(item.id)}
                >
                  Remover
                </button>
              </div>
            )}
          </article>
        ))}

        {!readOnly && (
          <ItemForm
            key={editingItemId ?? 'new-item'}
            catalog={catalog}
            initial={editingItem?.input}
            title={editingItem ? 'Editar item' : 'Adicionar item'}
            submitLabel={editingItem ? 'Salvar alterações' : 'Adicionar ao orçamento'}
            onCancel={editingItem ? () => setEditingItemId(null) : undefined}
            onSubmit={(input) => {
              if (editingItemId) void onUpdateItem(editingItemId, input)
              else void onAddItem(input)
            }}
          />
        )}
      </CollapsibleSection>

      <AdditionalCostsSection
        costs={quote.additionalCosts}
        disabled={readOnly}
        onChange={(c) => void onCosts(c)}
      />

      <section className="totals">
        <div><span>Itens</span><strong>{formatBrl(quote.itemsTotal)}</strong></div>
        <div><span>Adicionais</span><strong>{formatBrl(quote.additionalTotal)}</strong></div>
        <div className="totals__grand"><span>Total</span><strong>{formatBrl(quote.grandTotal)}</strong></div>
      </section>

      <footer className="actions">
        {readOnly ? (
          <>
            <button type="button" className="btn primary" onClick={() => void onPdf()}>
              Baixar / compartilhar PDF
            </button>
            <button type="button" className="btn" onClick={() => void onRevise()}>
              Criar revisão
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn primary"
              disabled={busy || quote.items.length === 0}
              onClick={() => void onEmit()}
            >
              {busy ? 'Gerando…' : 'Emitir + PDF'}
            </button>
            <button type="button" className="btn" onClick={() => void onPdf()} disabled={quote.items.length === 0}>
              Prévia / compartilhar PDF
            </button>
          </>
        )}
      </footer>
    </div>
  )
}

function CustomerSection({
  customer,
  disabled,
  onChange,
}: {
  customer: CustomerInfo
  disabled: boolean
  onChange: (c: CustomerInfo) => void
}) {
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [cepMessage, setCepMessage] = useState<string | null>(null)
  const customerRef = useRef(customer)
  customerRef.current = customer

  const applyCep = async (cepDigits: string) => {
    if (cepDigits.length !== 8 || disabled) return
    setCepStatus('loading')
    setCepMessage('Buscando CEP…')
    try {
      const data = await lookupCep(cepDigits)
      if (!data) {
        setCepStatus('error')
        setCepMessage('CEP não encontrado.')
        return
      }
      const current = customerRef.current
      onChange({
        ...current,
        cep: cepDigits,
        street: data.logradouro || current.street,
        neighborhood: data.bairro || current.neighborhood,
        city: data.localidade || current.city,
        state: data.uf || current.state,
        complement: data.complemento || current.complement,
        address: undefined,
      })
      setCepStatus('ok')
      setCepMessage('Endereço preenchido. Confira o número.')
    } catch {
      setCepStatus('error')
      setCepMessage('Não foi possível consultar o CEP.')
    }
  }

  const hasCustomer = Boolean(
    customer.name?.trim() ||
      customer.phone?.trim() ||
      customer.cep?.trim() ||
      customer.street?.trim(),
  )

  return (
    <CollapsibleSection
      title={
        <>
          Cliente <span className="muted">(opcional)</span>
        </>
      }
      defaultOpen={!hasCustomer}
    >
      <div className="grid">
        <label>
          Nome
          <input
            disabled={disabled}
            value={customer.name ?? ''}
            onChange={(e) => onChange({ ...customer, name: e.target.value })}
          />
        </label>
        <label>
          Telefone
          <input
            disabled={disabled}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="tel"
            value={customer.phone ?? ''}
            onChange={(e) =>
              onChange({
                ...customer,
                phone: digitsOnly(e.target.value),
              })
            }
          />
        </label>
        <label>
          CEP
          <input
            disabled={disabled}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            value={formatCep(customer.cep ?? '')}
            onChange={(e) => {
              const cep = digitsOnly(e.target.value, 8)
              onChange({ ...customer, cep })
              setCepStatus('idle')
              setCepMessage(null)
              if (cep.length === 8) void applyCep(cep)
            }}
          />
        </label>
        <label>
          UF
          <input
            disabled={disabled}
            maxLength={2}
            autoComplete="address-level1"
            value={customer.state ?? ''}
            onChange={(e) =>
              onChange({
                ...customer,
                state: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2),
              })
            }
          />
        </label>
        <label className="full">
          Rua / logradouro
          <input
            disabled={disabled}
            autoComplete="street-address"
            value={customer.street ?? customer.address ?? ''}
            onChange={(e) =>
              onChange({ ...customer, street: e.target.value, address: undefined })
            }
          />
        </label>
        <label>
          Número
          <input
            disabled={disabled}
            value={customer.number ?? ''}
            onChange={(e) => onChange({ ...customer, number: e.target.value })}
          />
        </label>
        <label>
          Complemento
          <input
            disabled={disabled}
            value={customer.complement ?? ''}
            onChange={(e) => onChange({ ...customer, complement: e.target.value })}
          />
        </label>
        <label>
          Bairro
          <input
            disabled={disabled}
            value={customer.neighborhood ?? ''}
            onChange={(e) => onChange({ ...customer, neighborhood: e.target.value })}
          />
        </label>
        <label>
          Cidade
          <input
            disabled={disabled}
            autoComplete="address-level2"
            value={customer.city ?? ''}
            onChange={(e) => onChange({ ...customer, city: e.target.value })}
          />
        </label>
        <label className="full">
          Observações
          <textarea
            disabled={disabled}
            rows={2}
            value={customer.notes ?? ''}
            onChange={(e) => onChange({ ...customer, notes: e.target.value })}
          />
        </label>
      </div>
      {cepMessage && (
        <p className={`cep-status${cepStatus === 'error' ? ' cep-status--error' : ''}`}>
          {cepStatus === 'loading' ? 'Buscando CEP…' : cepMessage}
        </p>
      )}
    </CollapsibleSection>
  )
}

function CollapsibleSection({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: ReactNode
  badge?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details className="section collapsible-section" defaultOpen={defaultOpen}>
      <summary className="collapsible-section__summary">
        <span className="collapsible-section__heading">{title}</span>
        {badge}
        <span className="collapsible-section__chevron" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="collapsible-section__body">{children}</div>
    </details>
  )
}

function parseMoneyBr(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const normalized =
    trimmed.includes(',') && trimmed.includes('.')
      ? trimmed.replace(/\./g, '').replace(',', '.')
      : trimmed.replace(',', '.')
  const n = Number(normalized)
  if (Number.isNaN(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

function AdditionalCostsSection({
  costs,
  disabled,
  onChange,
}: {
  costs: AdditionalCost[]
  disabled: boolean
  onChange: (c: AdditionalCost[]) => void
}) {
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')

  const add = () => {
    const value = parseMoneyBr(amount)
    if (!label.trim() || value == null) return
    if (label.trim().toLowerCase() === 'frete') return
    onChange([
      ...costs,
      { id: crypto.randomUUID(), label: label.trim(), amount: value },
    ])
    setLabel('')
    setAmount('')
  }

  const updateAmount = (id: string, raw: string) => {
    const value = parseMoneyBr(raw)
    if (value == null) return
    onChange(costs.map((c) => (c.id === id ? { ...c, amount: value } : c)))
  }

  return (
    <CollapsibleSection
      title="Custos adicionais"
      badge={<span className="pill">{costs.length}</span>}
      defaultOpen
    >
      <ul className="cost-list">
        {costs.map((c) => {
          const freight = isFreightCost(c)
          return (
            <li key={c.id}>
              <span>{c.label}</span>
              {disabled ? (
                <span>{formatBrl(c.amount)}</span>
              ) : (
                <input
                  className="money-input"
                  inputMode="decimal"
                  aria-label={`Valor ${c.label}`}
                  defaultValue={c.amount.toFixed(2).replace('.', ',')}
                  key={`${c.id}-${c.amount}`}
                  onBlur={(e) => updateAmount(c.id, e.target.value)}
                />
              )}
              {!disabled && !freight ? (
                <button
                  type="button"
                  className="btn danger link"
                  onClick={() => onChange(costs.filter((x) => x.id !== c.id))}
                >
                  ×
                </button>
              ) : (
                <span className="cost-list__spacer" aria-hidden />
              )}
            </li>
          )
        })}
      </ul>
      {!disabled && (
        <div className="inline-form">
          <input
            placeholder="Ex.: Andaime"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <input
            className="money-input"
            placeholder="0,00"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button type="button" className="btn" onClick={add}>
            +
          </button>
        </div>
      )}
    </CollapsibleSection>
  )
}

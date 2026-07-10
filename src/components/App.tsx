import { useEffect, useState } from 'react'
import type {
  AdditionalCost,
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
  formatBrl,
  removeItem,
  setAdditionalCosts,
  setCustomer,
} from '../domain/quote'
import { createRepository } from '../data/repository'
import { downloadBlob, generateQuotePdf } from '../pdf/generateQuotePdf'
import { ItemForm } from './ItemForm'

const repo = createRepository()

type View = 'list' | 'editor'

export function App() {
  const [view, setView] = useState<View>('list')
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    const [c, list] = await Promise.all([repo.getCatalog(), repo.listQuotes()])
    setCatalog(c)
    setQuotes(list)
  }

  useEffect(() => {
    void refresh().catch((e) => setError(String(e)))
  }, [])

  const openNew = async () => {
    if (!catalog) return
    const number = await repo.nextQuoteNumber()
    const draft = createEmptyDraft(number, catalog.config.version)
    setQuote(draft)
    setView('editor')
    setError(null)
  }

  const openQuote = async (id: string) => {
    const q = await repo.getQuote(id)
    if (!q) return
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
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const onRemoveItem = async (itemId: string) => {
    if (!quote) return
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
      const emitted = emitQuote(quote)
      await persist(emitted)
      const blob = await generateQuotePdf(emitted)
      downloadBlob(blob, `${emitted.number}-R${emitted.revision}.pdf`)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const onPdf = async () => {
    if (!quote) return
    const blob = await generateQuotePdf(quote)
    downloadBlob(blob, `${quote.number}-R${quote.revision}.pdf`)
  }

  const onRevise = async () => {
    if (!quote) return
    const rev = createRevision(quote)
    await persist(rev)
    setQuote(rev)
  }

  if (!catalog) {
    return (
      <div className="shell">
        <p className="muted">Carregando…</p>
      </div>
    )
  }

  if (view === 'list') {
    return (
      <div className="shell">
        <header className="hero">
          <p className="brand">Forte Vidros</p>
          <h1>Orçamentos</h1>
          <p className="lede">
            Meça no local e emita o orçamento na hora.
          </p>
          <button type="button" className="btn primary" onClick={() => void openNew()}>
            Novo orçamento
          </button>
        </header>

        <section className="section">
          <h2>Recentes</h2>
          {quotes.length === 0 ? (
            <p className="muted">Nenhum orçamento ainda.</p>
          ) : (
            <ul className="quote-list">
              {quotes.map((q) => (
                <li key={q.id}>
                  <button type="button" className="quote-card" onClick={() => void openQuote(q.id)}>
                    <span className="quote-card__title">
                      {q.number} · R{q.revision}
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

  return (
    <div className="shell">
      <header className="topbar">
        <button type="button" className="btn ghost" onClick={() => { setView('list'); void refresh() }}>
          ← Lista
        </button>
        <div>
          <p className="brand-sm">Forte Vidros</p>
          <h1 className="title-sm">
            {quote.number} · R{quote.revision}
          </h1>
        </div>
      </header>

      {error && <div className="banner error">{error}</div>}

      <CustomerSection
        customer={quote.customer}
        disabled={readOnly}
        onChange={(c) => void onCustomer(c)}
      />

      <section className="section">
        <div className="section-head">
          <h2>Itens</h2>
          <span className="pill">{quote.items.length}</span>
        </div>

        {quote.items.map((item) => (
          <article key={item.id} className="item-block">
            <div className="item-block__head">
              <strong>{item.result.label}</strong>
              <span>{formatBrl(item.result.breakdown.finalPrice)}</span>
            </div>
            <details>
              <summary>Detalhes do custo</summary>
              <ul className="breakdown">
                <li>Mão de obra: {formatBrl(item.result.breakdown.labor)}</li>
                <li>Vidros: {formatBrl(item.result.breakdown.glass)}</li>
                <li>Alumínios: {formatBrl(item.result.breakdown.aluminum)}</li>
                <li>Ferragens: {formatBrl(item.result.breakdown.hardware)}</li>
                <li>Acessórios: {formatBrl(item.result.breakdown.accessories)}</li>
                <li>Adicionais do item: {formatBrl(item.result.breakdown.extras)}</li>
                <li>Custo: {formatBrl(item.result.breakdown.totalCost)}</li>
              </ul>
            </details>
            {!readOnly && (
              <button type="button" className="btn danger link" onClick={() => void onRemoveItem(item.id)}>
                Remover
              </button>
            )}
          </article>
        ))}

        {!readOnly && (
          <ItemForm
            catalog={catalog}
            onSubmit={(input) => void onAddItem(input)}
          />
        )}
      </section>

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
              Baixar PDF
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
              Prévia PDF
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
  return (
    <section className="section">
      <h2>Cliente <span className="muted">(opcional)</span></h2>
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
            inputMode="tel"
            value={customer.phone ?? ''}
            onChange={(e) => onChange({ ...customer, phone: e.target.value })}
          />
        </label>
        <label className="full">
          Endereço
          <input
            disabled={disabled}
            value={customer.address ?? ''}
            onChange={(e) => onChange({ ...customer, address: e.target.value })}
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
    </section>
  )
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
    const value = Number(amount.replace(',', '.'))
    if (!label.trim() || Number.isNaN(value)) return
    onChange([
      ...costs,
      { id: crypto.randomUUID(), label: label.trim(), amount: value },
    ])
    setLabel('')
    setAmount('')
  }

  return (
    <section className="section">
      <h2>Custos adicionais</h2>
      {costs.length === 0 ? (
        <p className="muted">Nenhum custo adicional.</p>
      ) : (
        <ul className="cost-list">
          {costs.map((c) => (
            <li key={c.id}>
              <span>{c.label}</span>
              <span>{formatBrl(c.amount)}</span>
              {!disabled && (
                <button
                  type="button"
                  className="btn danger link"
                  onClick={() => onChange(costs.filter((x) => x.id !== c.id))}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!disabled && (
        <div className="inline-form">
          <input
            placeholder="Ex.: Deslocamento"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <input
            placeholder="R$"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button type="button" className="btn" onClick={add}>
            +
          </button>
        </div>
      )}
    </section>
  )
}

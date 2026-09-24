import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type {
  AdditionalCost,
  AppSettings,
  Catalog,
  CustomerInfo,
  ItemInput,
  ProductKind,
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
  quoteShareText,
  isFreightCost,
  recomputeTotals,
  removeItem,
  setAdditionalCosts,
  setDiscounts,
  setCustomer,
  updateItem,
} from '../domain/quote'
import { useAccess } from '../auth/access'
import { createRepository } from '../data/repository'
import { digitsOnly, formatCep, lookupCep } from '../data/viacep'
import { downloadBlob, generateQuotePdf, shareQuoteText } from '../pdf/generateQuotePdf'
import { CatalogEditor } from './CatalogEditor'
import { AppNav, type AppSection } from './AppNav'
import { ITEM_KINDS, ItemForm } from './ItemForm'
import { Modal } from './Modal'
import { SettingsEditor } from './SettingsEditor'

const repo = createRepository()

type View = 'list' | 'editor' | 'catalog' | 'settings'

export function App() {
  const access = useAccess()
  const isAdmin = access.role !== 'vendedor'
  const [view, setView] = useState<View>('list')
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const [pendingDeleteQuote, setPendingDeleteQuote] = useState(false)
  const [emitNeedsName, setEmitNeedsName] = useState(false)
  const [itemModal, setItemModal] = useState<
    null | { mode: 'pick' } | { mode: 'create'; kind: ProductKind } | { mode: 'edit'; id: string }
  >(null)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [shareText, setShareText] = useState<string | null>(null)
  const [listQuery, setListQuery] = useState('')
  const [listStatus, setListStatus] = useState<'all' | 'emitted' | 'draft'>('all')

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

  useEffect(() => {
    if (!pendingRemoveId && !pendingDeleteQuote && !emitNeedsName) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (
        target.closest('.remove-pop') ||
        target.closest('.icon-btn--remove') ||
        target.closest('.topbar__delete') ||
        target.closest('.emit-wrap')
      )
        return
      setPendingRemoveId(null)
      setPendingDeleteQuote(false)
      setEmitNeedsName(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [pendingRemoveId, pendingDeleteQuote, emitNeedsName])

  const filteredQuotes = useMemo(() => {
    const q = listQuery.trim().toLowerCase()
    return quotes.filter((quoteRow) => {
      if (listStatus === 'emitted' && quoteRow.status !== 'emitted') return false
      if (listStatus === 'draft' && quoteRow.status === 'emitted') return false
      if (!q) return true
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
  }, [quotes, listQuery, listStatus])

  const openNew = async () => {
    if (!catalog) return
    const number = await repo.nextQuoteNumber()
    const draft = createEmptyDraft(number, catalog.config.version)
    setItemModal(null)
    setQuote(draft)
    setView('editor')
    setError(null)
  }

  const openQuote = async (id: string) => {
    const q = await repo.getQuote(id)
    if (!q) return
    setItemModal(null)
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
      setItemModal(null)
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
      setItemModal(null)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const onRemoveItem = async (itemId: string) => {
    if (!quote) return
    if (itemModal?.mode === 'edit' && itemModal.id === itemId) setItemModal(null)
    await persist(removeItem(quote, itemId))
  }

  const onDeleteDraft = async () => {
    if (!quote || quote.status !== 'draft') return
    setPendingDeleteQuote(false)
    await repo.deleteQuote(quote.id)
    setQuote(null)
    setItemModal(null)
    setView('list')
    await refresh()
  }

  const onCustomer = async (customer: CustomerInfo) => {
    if (!quote) return
    await persist(setCustomer(quote, customer))
  }

  const onCosts = async (costs: AdditionalCost[]) => {
    if (!quote) return
    await persist(setAdditionalCosts(quote, costs))
  }

  const onDiscounts = async (discounts: AdditionalCost[]) => {
    if (!quote) return
    await persist(setDiscounts(quote, discounts))
  }

  const pdfFilename = (q: Quote) => `${formatQuoteCode(q.number, q.revision)}.pdf`

  const buildPdfBlob = async (q: Quote) =>
    generateQuotePdf(q, {
      validityDays: settings?.quoteValidityDays ?? 15,
      settings: settings ?? undefined,
    })

  const closePdfPreview = () => {
    setPdfPreviewUrl((url) => {
      if (url) URL.revokeObjectURL(url)
      return null
    })
  }

  const onPreviewPdf = async () => {
    if (!quote) return
    try {
      setBusy(true)
      const blob = await buildPdfBlob(quote)
      const url = URL.createObjectURL(blob)
      setPdfPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const onDownloadPdf = async () => {
    if (!quote) return
    try {
      setBusy(true)
      const blob = await buildPdfBlob(quote)
      downloadBlob(blob, pdfFilename(quote))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const openSharePreview = () => {
    if (!quote) return
    const shop =
      settings?.establishment.tradeName?.trim() ||
      settings?.establishment.name?.trim() ||
      'Vidraçaria'
    setShareText(
      quoteShareText(quote, {
        shopName: shop,
        cta: settings?.shareCta,
      }),
    )
  }

  const confirmShare = async () => {
    if (!shareText) return
    try {
      await shareQuoteText(shareText)
      setShareText(null)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const onEmit = async () => {
    if (!quote) return
    if (!quote.customer.name?.trim()) {
      setEmitNeedsName(true)
      return
    }
    try {
      setBusy(true)
      const validityDays = settings?.quoteValidityDays ?? 15
      const emitted = emitQuote(quote, validityDays)
      await persist(emitted)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
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
    if (!isAdmin && section !== 'list') return
    setView(section)
    if (section === 'list') void refresh()
  }

  if (view === 'catalog' && isAdmin) {
    return (
      <CatalogEditor
        catalog={catalog}
        onSave={onSaveCatalog}
        onNavigate={goSection}
      />
    )
  }

  if (view === 'settings' && isAdmin) {
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
      <div className="shell shell--wide">
        <header className="topbar">
          <div>
            <p className="brand-sm">App Vidros</p>
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
              <div className="list-status">
                {(
                  [
                    ['all', 'Todos'],
                    ['emitted', 'Emitidos'],
                    ['draft', 'Rascunhos'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`chip${listStatus === id ? ' active' : ''}`}
                    onClick={() => setListStatus(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {quotes.length === 0 ? (
            <p className="muted">Nenhum orçamento ainda.</p>
          ) : filteredQuotes.length === 0 ? (
            <p className="muted">
              {listQuery.trim() ? 'Nenhum orçamento na busca.' : 'Nenhum orçamento nesse filtro.'}
            </p>
          ) : (
            <ul className="quote-list">
              {filteredQuotes.map((q) => (
                <li key={q.id}>
                  <button type="button" className="quote-card" onClick={() => void openQuote(q.id)}>
                    <span className="quote-card__title">
                      {formatQuoteCode(q.number, q.revision)}
                    </span>
                    <span className="quote-card__date">{quoteListDate(q)}</span>
                    <span className="quote-card__meta">
                      <span className="quote-card__name">{q.customer.name || 'Sem cliente'}</span>
                      {' · '}
                      <span
                        className={`quote-card__status quote-card__status--${q.status === 'emitted' ? 'emitted' : 'draft'}`}
                      >
                        {q.status === 'emitted' ? 'Emitido' : 'Rascunho'}
                      </span>
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
  const editingItem =
    itemModal?.mode === 'edit' ? quote.items.find((i) => i.id === itemModal.id) : undefined
  const closeItemModal = () => {
    setItemModal(null)
    setError(null)
  }

  return (
    <div className="shell">
      <header className="quote-head">
        <div className="quote-head__bar">
          <button type="button" className="btn ghost" onClick={() => { setView('list'); void refresh() }}>
            ← Orçamentos
          </button>
        </div>
        <div className="quote-head__title">
          <h1>{formatQuoteCode(quote.number, quote.revision)}</h1>
          <span className={`status-pill status-pill--${readOnly ? 'emitted' : 'draft'}`}>
            {readOnly ? 'Emitido' : 'Rascunho'}
          </span>
          {!readOnly && (
            <div className="topbar__delete">
              <button
                type="button"
                className="btn danger-solid"
                onClick={() => setPendingDeleteQuote((open) => !open)}
              >
                Excluir rascunho
              </button>
              {pendingDeleteQuote && (
                <div className="remove-pop" role="dialog" aria-label="Excluir rascunho">
                  <span>Excluir rascunho?</span>
                  <button
                    type="button"
                    className="btn remove-pop__yes"
                    onClick={() => void onDeleteDraft()}
                  >
                    Sim
                  </button>
                  <button type="button" className="btn" onClick={() => setPendingDeleteQuote(false)}>
                    Não
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {error && !itemModal && <div className="banner error">{error}</div>}

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
            className={`item-block${itemModal?.mode === 'edit' && itemModal.id === item.id ? ' item-block--editing' : ''}`}
          >
            <div className="item-block__head">
              <strong>{item.result.label}</strong>
              <span className="item-block__price">{formatBrl(item.result.breakdown.finalPrice)}</span>
            </div>
            <div className={`item-block__tools${readOnly ? '' : ' item-block__tools--actions'}`}>
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
                {item.input.kind !== 'custom' && item.input.extras.length > 0 ? (
                  item.input.extras.map((extra) => (
                    <li key={extra.id} className="breakdown__extra">
                      <span>{extra.description}</span>
                      <span>{formatBrl(extra.amount)}</span>
                    </li>
                  ))
                ) : (
                  <li>
                    <span>Adicionais do item</span>
                    <span>{formatBrl(item.result.breakdown.extras)}</span>
                  </li>
                )}
                <li className="breakdown__cost">
                  <span>Custo</span>
                  <span>{formatBrl(item.result.breakdown.totalCost)}</span>
                </li>
                <li className="breakdown__margin">
                  <span>Margem ({(item.result.breakdown.markup * 100).toFixed(0)}%)</span>
                  <span>{formatBrl(item.result.breakdown.marginAmount)}</span>
                </li>
              </ul>
            </details>
            {!readOnly && (
              <div className="item-block__actions">
                <button
                  type="button"
                  className="icon-btn icon-btn--edit"
                  aria-label="Editar"
                  onClick={() => {
                    setError(null)
                    setItemModal({ mode: 'edit', id: item.id })
                  }}
                >
                  <PencilIcon />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--remove"
                  aria-label="Remover"
                  onClick={() =>
                    setPendingRemoveId((current) => (current === item.id ? null : item.id))
                  }
                >
                  <TrashIcon />
                </button>
                {pendingRemoveId === item.id && (
                  <div className="remove-pop" role="dialog" aria-label="Confirmar remoção">
                    <span>Confirmar remoção?</span>
                    <button
                      type="button"
                      className="btn remove-pop__yes"
                      onClick={() => {
                        setPendingRemoveId(null)
                        void onRemoveItem(item.id)
                      }}
                    >
                      Sim
                    </button>
                    <button type="button" className="btn" onClick={() => setPendingRemoveId(null)}>
                      Não
                    </button>
                  </div>
                )}
              </div>
            )}
            </div>
          </article>
        ))}

        {quote.items.length === 0 && (
          <p className="muted">Nenhum item neste orçamento.</p>
        )}

        {!readOnly && (
          <div className="items-toolbar">
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setError(null)
                setItemModal({ mode: 'pick' })
              }}
            >
              Adicionar item
            </button>
          </div>
        )}
      </CollapsibleSection>

      {!readOnly && itemModal?.mode === 'pick' && (
        <Modal title="Tipo do item" onClose={closeItemModal}>
          <div className="kind-grid kind-grid--pick">
            {ITEM_KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                className="chip"
                onClick={() => setItemModal({ mode: 'create', kind: k.id })}
              >
                {k.label}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {!readOnly && itemModal && itemModal.mode !== 'pick' && catalog && (
        <Modal
          className="modal--item"
          title={itemModal.mode === 'edit' ? 'Editar item' : 'Adicionar item'}
          onClose={closeItemModal}
        >
          {error && <p className="banner error">{error}</p>}
          <ItemForm
            key={itemModal.mode === 'edit' ? itemModal.id : itemModal.kind}
            catalog={catalog}
            initial={editingItem?.input}
            lockKind={itemModal.mode === 'edit' ? editingItem?.input.kind : itemModal.kind}
            hideTitle
            submitLabel={itemModal.mode === 'edit' ? 'Salvar alterações' : 'Adicionar item'}
            onCancel={closeItemModal}
            onSubmit={(input) => {
              if (itemModal.mode === 'edit') void onUpdateItem(itemModal.id, input)
              else void onAddItem(input)
            }}
          />
        </Modal>
      )}

      <AdditionalCostsSection
        costs={quote.additionalCosts}
        disabled={readOnly}
        onChange={(c) => void onCosts(c)}
      />

      <DiscountSection
        discounts={quote.discounts ?? []}
        disabled={readOnly}
        onChange={(d) => void onDiscounts(d)}
      />

      <section className="totals">
        <div><span>Itens</span><strong>{formatBrl(quote.itemsTotal)}</strong></div>
        <div><span>Adicionais</span><strong>{formatBrl(quote.additionalTotal)}</strong></div>
        {(quote.discountTotal ?? 0) > 0 && (
          <div><span>Desconto</span><strong>{formatBrl(quote.discountTotal)}</strong></div>
        )}
        <div className="totals__grand"><span>Total</span><strong>{formatBrl(quote.grandTotal)}</strong></div>
      <footer className="actions">
        {readOnly ? (
          <ActionButton
            label="Criar uma revisão"
            hint="Cria uma revisão editável a partir deste orçamento."
            className="revise"
            disabled={busy}
            onClick={() => void onRevise()}
          />
        ) : (
          <div className="emit-wrap">
            <ActionButton
              label="Emitir orçamento"
              hint={
                quote.items.length === 0
                  ? 'Inclua ao menos um item para emitir.'
                  : 'Finaliza o orçamento e libera baixar e enviar.'
              }
              className="primary"
              disabled={busy || quote.items.length === 0}
              onClick={() => void onEmit()}
            />
            {emitNeedsName && !quote.customer.name?.trim() && (
              <div className="remove-pop emit-pop" role="alertdialog" aria-label="Nome do cliente obrigatório">
                <span>Preencha o nome do cliente para emitir.</span>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    setEmitNeedsName(false)
                    focusCustomerName()
                  }}
                >
                  Preencher nome
                </button>
              </div>
            )}
          </div>
        )}
        <div className="actions__pdf">
          <ActionButton
            label="Prévia"
            hint={
              quote.items.length === 0
                ? 'Inclua ao menos um item para ver a prévia.'
                : 'Abrir a prévia do PDF.'
            }
            disabled={busy || quote.items.length === 0}
            onClick={() => void onPreviewPdf()}
          />
          <ActionButton
            label="Baixar"
            hint={pdfShareHint(readOnly, quote.items.length === 0, 'baixar')}
            className="primary"
            disabled={busy || !readOnly || quote.items.length === 0}
            onClick={() => void onDownloadPdf()}
          />
          <ActionButton
            label="Enviar"
            hint={pdfShareHint(readOnly, quote.items.length === 0, 'enviar')}
            className="primary"
            disabled={busy || !readOnly || quote.items.length === 0}
            onClick={openSharePreview}
          />
        </div>
      </footer>
      </section>

      {pdfPreviewUrl && (
        <Modal className="modal--pdf" title="Prévia do PDF" onClose={closePdfPreview}>
          <iframe title="Prévia do orçamento" src={pdfPreviewUrl} />
          <div className="modal__actions modal__actions--pdf">
            <ActionButton label="Fechar" hint="Fechar a prévia." onClick={closePdfPreview} />
            <ActionButton
              label="Baixar"
              hint={pdfShareHint(readOnly, false, 'baixar')}
              className="primary"
              disabled={!readOnly || busy}
              onClick={() => void onDownloadPdf()}
            />
            <ActionButton
              label="Enviar"
              hint={pdfShareHint(readOnly, false, 'enviar')}
              className="primary"
              disabled={!readOnly || busy}
              onClick={openSharePreview}
            />
          </div>
        </Modal>
      )}

      {shareText && (
        <Modal title="Enviar no WhatsApp" onClose={() => setShareText(null)}>
          <p className="muted catalog-hint">Prévia da mensagem. O negrito sai no WhatsApp.</p>
          <WhatsAppPreview text={shareText} />
          <div className="modal__actions">
            <button type="button" className="btn" onClick={() => setShareText(null)}>
              Voltar
            </button>
            <button type="button" className="btn primary zap-send" onClick={() => void confirmShare()}>
              <WhatsAppIcon />
              Enviar no WhatsApp
            </button>
          </div>
        </Modal>
      )}
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

  const hasName = Boolean(customer.name?.trim())

  return (
    <CollapsibleSection
      title={
        <>
          Cliente
          {hasName && <span className="customer-name"> · {customer.name!.trim()}</span>}
          {!hasName && !disabled && <span className="missing-flag">Preencha o nome</span>}
        </>
      }
      defaultOpen={!hasName}
      className="customer-section"
    >
      <div className="grid">
        <label>
          <span>
            Nome <span className="required-mark">*</span>
          </span>
          <input
            id="customer-name"
            disabled={disabled}
            required
            aria-invalid={!disabled && !hasName}
            placeholder="Obrigatório para emitir"
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

function focusCustomerName() {
  const input = document.getElementById('customer-name')
  if (!(input instanceof HTMLInputElement)) return
  const details = input.closest('details')
  if (details && !details.open) details.open = true
  window.requestAnimationFrame(() => {
    input.scrollIntoView({ block: 'center', behavior: 'smooth' })
    input.focus({ preventScroll: true })
  })
}

function quoteListDate(quote: Quote): string {
  const iso = quote.status === 'emitted' ? quote.emittedAt ?? quote.updatedAt : quote.updatedAt
  return new Date(iso).toLocaleDateString('pt-BR')
}

function CollapsibleSection({
  title,
  badge,
  defaultOpen = false,
  className,
  children,
}: {
  title: ReactNode
  badge?: ReactNode
  defaultOpen?: boolean
  className?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <details
      className={`section collapsible-section${className ? ` ${className}` : ''}`}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
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

function WhatsAppPreview({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    const ok = await writeClipboard(text)
    if (!ok) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="zap-preview">
      <button
        type="button"
        className="icon-btn zap-preview__copy"
        aria-label={copied ? 'Texto copiado' : 'Copiar texto'}
        onClick={() => void copy()}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
      {text.split('\n').map((line, index) => (
        <p key={index}>{renderZapLine(line)}</p>
      ))}
    </div>
  )
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.left = '-9999px'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}

function renderZapLine(line: string): ReactNode {
  const parts = line.split(/(\*[^*]+\*)/g)
  return parts.map((part, index) =>
    part.startsWith('*') && part.endsWith('*') && part.length > 2 ? (
      <strong key={index}>{part.slice(1, -1)}</strong>
    ) : (
      part
    ),
  )
}

function pdfShareHint(emitted: boolean, empty: boolean, action: 'baixar' | 'enviar'): string {
  if (empty) return 'Inclua ao menos um item.'
  if (!emitted) {
    return action === 'baixar'
      ? 'Emita o orçamento para baixar o PDF.'
      : 'Emita o orçamento para enviar.'
  }
  return action === 'baixar' ? 'Baixar o PDF.' : 'Enviar o resumo no WhatsApp.'
}

function ActionButton({
  label,
  hint,
  disabled,
  className,
  onClick,
}: {
  label: string
  hint: string
  disabled?: boolean
  className?: string
  onClick: () => void
}) {
  return (
    <span className="btn-slot" title={hint}>
      <button
        type="button"
        className={className ? `btn ${className}` : 'btn'}
        disabled={disabled}
        onClick={onClick}
      >
        {label}
      </button>
    </span>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.39-1.41a10 10 0 0 0 4.65 1.14h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2zm5.76 13.9c-.24.68-1.4 1.3-1.94 1.38-.5.08-1.12.11-1.81-.11-.41-.14-.95-.31-1.63-.6-2.87-1.24-4.74-4.13-4.88-4.32-.14-.19-1.15-1.53-1.15-2.92s.73-2.07 1-2.35c.24-.28.64-.41 1.02-.41.12 0 .23 0 .33.01.3.01.45.03.65.5.24.58.82 2 .89 2.15.07.14.12.32.02.51-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.56.16.27.71 1.17 1.52 1.9 1.05.93 1.93 1.22 2.2 1.36.28.14.44.12.6-.07.16-.19.7-.81.88-1.09.19-.28.37-.23.62-.14.26.09 1.62.76 1.9.9.28.14.46.21.53.32.07.12.07.68-.17 1.36z"
      />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0 0-2.1L16.6 5.5a1.5 1.5 0 0 0-2.1 0L4 16v4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M13.5 6.5l4 4" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 7h14M9 7V5h6v2M8 7l.8 12h6.4L16 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
      className="collapsible-section--tight"
      title="Custos adicionais"
      badge={<span className="pill">{costs.length}</span>}
      defaultOpen
    >
      <ul className="cost-list">
        {costs.map((c) => {
          const freight = isFreightCost(c)
          return (
            <li key={c.id}>
              <div className="inline-form">
                <span className="inline-form__label">{c.label}</span>
                {disabled ? (
                  <span className="inline-form__value">{formatBrl(c.amount)}</span>
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
                {!disabled && (
                  <button
                    type="button"
                    className="btn btn--remove"
                    aria-label={freight ? 'Zerar frete' : `Excluir ${c.label}`}
                    onClick={() => {
                      if (freight) {
                        onChange(costs.map((x) => (x.id === c.id ? { ...x, amount: 0 } : x)))
                        return
                      }
                      onChange(costs.filter((x) => x.id !== c.id))
                    }}
                  >
                    <CrossIcon />
                  </button>
                )}
              </div>
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
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              add()
            }}
          />
          <input
            className="money-input"
            placeholder="0,00"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              add()
            }}
          />
          <button type="button" className="btn" onClick={add} aria-label="Adicionar custo">
            <PlusIcon />
          </button>
        </div>
      )}
    </CollapsibleSection>
  )
}

function DiscountSection({
  discounts,
  disabled,
  onChange,
}: {
  discounts: AdditionalCost[]
  disabled: boolean
  onChange: (d: AdditionalCost[]) => void
}) {
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')

  const add = () => {
    const value = parseMoneyBr(amount)
    if (!label.trim() || value == null || value <= 0) return
    onChange([...discounts, { id: crypto.randomUUID(), label: label.trim(), amount: value }])
    setLabel('')
    setAmount('')
  }

  const updateAmount = (id: string, raw: string) => {
    const value = parseMoneyBr(raw)
    if (value == null) return
    onChange(discounts.map((d) => (d.id === id ? { ...d, amount: value } : d)))
  }

  return (
    <CollapsibleSection
      className="collapsible-section--tight"
      title="Descontos"
      badge={<span className="pill">{discounts.length}</span>}
    >
      <ul className="cost-list">
        {discounts.map((d) => (
          <li key={d.id}>
            <div className="inline-form">
              <span className="inline-form__label">{d.label}</span>
              {disabled ? (
                <span className="inline-form__value">{formatBrl(d.amount)}</span>
              ) : (
                <input
                  className="money-input"
                  inputMode="decimal"
                  aria-label={`Valor ${d.label}`}
                  defaultValue={d.amount.toFixed(2).replace('.', ',')}
                  key={`${d.id}-${d.amount}`}
                  onBlur={(e) => updateAmount(d.id, e.target.value)}
                />
              )}
              {!disabled && (
                <button
                  type="button"
                  className="btn btn--remove"
                  aria-label={`Excluir ${d.label}`}
                  onClick={() => onChange(discounts.filter((x) => x.id !== d.id))}
                >
                  <CrossIcon />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!disabled && (
        <div className="inline-form">
          <input
            placeholder="Ex.: Cortesia"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              add()
            }}
          />
          <input
            className="money-input"
            placeholder="0,00"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              add()
            }}
          />
          <button type="button" className="btn" onClick={add} aria-label="Adicionar desconto">
            <PlusIcon />
          </button>
        </div>
      )}
    </CollapsibleSection>
  )
}

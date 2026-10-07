import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type {
  AdditionalCost,
  AppSettings,
  Catalog,
  CustomerInfo,
  ItemInput,
  MarginMode,
  ProductKind,
  Quote,
} from '../domain/types'
import {
  addItem,
  createEmptyDraft,
  createRevision,
  draftOutdated,
  outdatedSince,
  emitQuote,
  dropEmptyFreight,
  formatBrl,
  formatQuoteCode,
  quotePdfFilename,
  quoteShareText,
  recomputeTotals,
  removeItem,
  repriceDraft,
  setAdditionalCosts,
  setDiscounts,
  setCustomer,
  updateItem,
} from '../domain/quote'
import { useAccess } from '../auth/access'
import { createRepository } from '../data/repository'
import { digitsOnly, formatCep, lookupCep } from '../data/viacep'
import {
  filterUfInput,
  formatPhone,
  isValidUf,
  phoneDdd,
  phoneDigits,
  withDefaultDdd,
} from '../domain/brazil'
import { marginLabel } from '../domain/itemDescription'
import {
  downloadBlob,
  generateQuotePdf,
  shareOrDownloadPdf,
  canSharePdfFiles,
  shareQuoteText,
} from '../pdf/generateQuotePdf'
import { CatalogEditor } from './CatalogEditor'
import { AppHeader, HeaderMenu, type AppSection } from './AppHeader'
import { CollapsibleSection } from './CollapsibleSection'
import { Dropdown } from './Dropdown'
import { SearchField } from './SearchField'
import { ITEM_KINDS, ItemForm } from './ItemForm'
import { ItemBlockHead } from './ItemBlockHead'
import { Modal } from './Modal'
import { PdfPreview } from './PdfPreview'
import { SettingsEditor } from './SettingsEditor'

const repo = createRepository()
const pdfShareSupported = canSharePdfFiles()

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
  const [pdfPreviewBlob, setPdfPreviewBlob] = useState<Blob | null>(null)
  const pdfCacheRef = useRef<{ key: string; promise: Promise<Blob>; blob?: Blob } | null>(null)
  const [shareText, setShareText] = useState<string | null>(null)
  const [sendOpen, setSendOpen] = useState(false)
  const [listQuery, setListQuery] = useState('')
  const [listStatus, setListStatus] = useState<'all' | 'emitted' | 'draft'>('all')
  /** Items that kept their old price after "Atualizar valores"; null = no note. */
  const [repriceFailed, setRepriceFailed] = useState<number | null>(null)
  const marginMode: MarginMode = settings?.marginMode ?? 'empresa'

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
    const draft = createEmptyDraft(number, catalog.config.version, marginMode)
    setItemModal(null)
    setRepriceFailed(null)
    setQuote(draft)
    setView('editor')
    setError(null)
  }

  const openQuote = async (id: string) => {
    const q = await repo.getQuote(id)
    if (!q) return
    setItemModal(null)
    setRepriceFailed(null)
    if (q.status === 'draft') {
      const costs = dropEmptyFreight(q.additionalCosts)
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

  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const latestSavedRef = useRef<Quote | null>(null)

  // Atualiza a tela antes de salvar: inputs controlados esperando a rede perdem
  // teclas. Saves em fila evitam que uma versão antiga termine por último.
  const persist = async (q: Quote) => {
    setQuote(q)
    latestSavedRef.current = q
    const save = saveQueueRef.current.then(() =>
      latestSavedRef.current === q ? repo.saveQuote(q) : undefined,
    )
    saveQueueRef.current = save.catch(() => undefined)
    await save
    if (latestSavedRef.current === q) await refresh()
  }

  const onAddItem = async (input: ItemInput) => {
    if (!quote || !catalog) return
    try {
      const next = addItem(quote, catalog, input, marginMode)
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
      const next = updateItem(quote, catalog, itemId, input, marginMode)
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

  const onRepriceDraft = async () => {
    if (!quote || !catalog) return
    const { quote: next, failed } = repriceDraft(quote, catalog, marginMode)
    await persist(next)
    setRepriceFailed(failed)
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

  const buildPdfBlob = async (q: Quote) =>
    generateQuotePdf(q, {
      validityDays: settings?.quoteValidityDays ?? 15,
      settings: settings ?? undefined,
    })

  const settingsPdfKey = useMemo(() => JSON.stringify(settings), [settings])
  const pdfCacheKey = (q: Quote) =>
    `${q.id}|${q.revision}|${q.status}|${q.updatedAt}|${settingsPdfKey}`
  const emittedPdfKey =
    quote && quote.status === 'emitted' && quote.items.length > 0 && settings
      ? pdfCacheKey(quote)
      : null

  /** Só orçamentos emitidos (imutáveis) entram no cache; rascunho sempre gera de novo. */
  const getPdfBlob = (q: Quote): Promise<Blob> => {
    if (q.status !== 'emitted') return buildPdfBlob(q)
    const key = pdfCacheKey(q)
    const cached = pdfCacheRef.current
    if (cached?.key === key) return cached.promise
    const entry: { key: string; promise: Promise<Blob>; blob?: Blob } = {
      key,
      promise: buildPdfBlob(q),
    }
    pdfCacheRef.current = entry
    entry.promise.then(
      (blob) => {
        entry.blob = blob
      },
      () => {
        if (pdfCacheRef.current === entry) pdfCacheRef.current = null
      },
    )
    return entry.promise
  }

  const readyPdfBlob = (q: Quote): Blob | null => {
    const cached = pdfCacheRef.current
    return q.status === 'emitted' && cached?.key === pdfCacheKey(q) ? (cached.blob ?? null) : null
  }

  // Pré-gera o PDF do emitido: o Safari só aceita navigator.share logo no gesto do click.
  useEffect(() => {
    if (!emittedPdfKey || !quote) return
    void getPdfBlob(quote).catch(() => undefined)
    // emittedPdfKey já cobre quote + settings.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [emittedPdfKey])

  const closePdfPreview = () => setPdfPreviewBlob(null)

  const onPreviewPdf = async () => {
    if (!quote) return
    try {
      setBusy(true)
      setPdfPreviewBlob(await getPdfBlob(quote))
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
      const blob = await getPdfBlob(quote)
      downloadBlob(blob, quotePdfFilename(quote))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const onSharePdf = async () => {
    if (!quote) return
    const filename = quotePdfFilename(quote)
    const ready = readyPdfBlob(quote)
    try {
      if (ready) {
        await shareOrDownloadPdf(ready, filename)
      } else {
        setBusy(true)
        await shareOrDownloadPdf(await getPdfBlob(quote), filename)
      }
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
        validityDays: settings?.quoteValidityDays,
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
        marginMode={marginMode}
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
        <AppHeader title="Orçamentos" current="list" onNavigate={goSection} />

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
              <SearchField
                label="Buscar por código, cliente ou telefone"
                value={listQuery}
                onChange={setListQuery}
              />
              <Dropdown
                className="list-status"
                label="Filtrar por status"
                value={listStatus}
                onChange={setListStatus}
                options={[
                  { value: 'all', label: 'Todos' },
                  { value: 'emitted', label: 'Emitidos' },
                  { value: 'draft', label: 'Rascunhos' },
                ]}
              />
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
  const outdated = draftOutdated(quote, catalog, marginMode)
  const outdatedDate = outdated && outdatedSince(outdated, catalog, settings?.marginModeChangedAt)
  const since = outdatedDate ? ` em ${outdatedDate.toLocaleDateString('pt-BR')}` : ''
  const editingItem =
    itemModal?.mode === 'edit' ? quote.items.find((i) => i.id === itemModal.id) : undefined
  const closeItemModal = () => {
    setItemModal(null)
    setError(null)
  }

  return (
    <div className="shell shell--with-bar">
      <header className="quote-head">
        <div className="quote-head__bar">
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Voltar para orçamentos"
            title="Voltar para orçamentos"
            onClick={() => { setView('list'); void refresh() }}
          >
            <BackIcon />
          </button>
          <div className="quote-head__titles">
            <h1 className="quote-head__code">{formatQuoteCode(quote.number, quote.revision)}</h1>
            <span className={`status-pill status-pill--${readOnly ? 'emitted' : 'draft'}`}>
              {readOnly ? 'Emitido' : 'Rascunho'}
            </span>
          </div>
          {readOnly ? (
            <button
              type="button"
              className="btn btn-icon revise"
              aria-label="Criar uma revisão"
              title="Criar uma revisão"
              disabled={busy}
              onClick={() => void onRevise()}
            >
              <RevisionIcon />
            </button>
          ) : (
            <div className="topbar__delete">
              <button
                type="button"
                className="btn btn-icon danger-solid"
                aria-label="Excluir rascunho"
                title="Excluir rascunho"
                onClick={() => setPendingDeleteQuote((open) => !open)}
              >
                <TrashIcon />
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
          <HeaderMenu current="list" onNavigate={goSection} />
        </div>
      </header>

      {error && !itemModal && <div className="banner error">{error}</div>}

      {outdated && (
        <div className="banner warn outdated-banner" role="status">
          <span>
            {outdated.catalog && outdated.margin ? (
              <>O <strong>catálogo</strong> e o <strong>cálculo de margem</strong> mudaram{since}.</>
            ) : outdated.catalog ? (
              <>O <strong>catálogo</strong> foi atualizado{since}.</>
            ) : (
              <>O <strong>cálculo de margem</strong> mudou{since}.</>
            )}
          </span>
          <button type="button" className="btn" onClick={() => void onRepriceDraft()}>
            Atualizar valores
          </button>
        </div>
      )}
      {repriceFailed !== null && !outdated && (
        <div
          className={`banner ${repriceFailed ? 'warn' : 'ok'} outdated-banner outdated-banner--done`}
          role="status"
        >
          Valores atualizados.
          {repriceFailed === 1 && ' 1 item manteve o valor anterior.'}
          {repriceFailed > 1 && ` ${repriceFailed} itens mantiveram o valor anterior.`}
        </div>
      )}

      <CustomerSection
        customer={quote.customer}
        disabled={readOnly}
        storeDdd={phoneDdd(settings?.establishment.phone)}
        onChange={(c) => void onCustomer(c)}
      />

      <CollapsibleSection
        title={
          <>
            Itens
            {quote.items.length === 0 && !readOnly && (
              <span className="missing-flag">Adicione um item!</span>
            )}
          </>
        }
        badge={<span className="pill">{quote.items.length}</span>}
        defaultOpen
      >
        {quote.items.map((item) => (
          <article
            key={item.id}
            className={`item-block${itemModal?.mode === 'edit' && itemModal.id === item.id ? ' item-block--editing' : ''}`}
          >
            <ItemBlockHead item={item} />
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
                {(item.result.breakdown.marginMode ?? 'empresa') !== 'autonomo' && (
                  <li className="breakdown__margin">
                    <span>{marginLabel(item.result.breakdown)}</span>
                    <span>{formatBrl(item.result.breakdown.marginAmount)}</span>
                  </li>
                )}
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
            marginMode={marginMode}
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

      {(quote.additionalTotal > 0 || (quote.discountTotal ?? 0) > 0) && (
        <section className="totals">
          <div><span>Itens</span><strong>{formatBrl(quote.itemsTotal)}</strong></div>
          {quote.additionalTotal > 0 && (
            <div><span>Adicionais</span><strong>{formatBrl(quote.additionalTotal)}</strong></div>
          )}
          {(quote.discountTotal ?? 0) > 0 && (
            <div><span>Desconto</span><strong>{formatBrl(quote.discountTotal)}</strong></div>
          )}
        </section>
      )}

      <footer className="action-bar">
        <div className="action-bar__inner">
          <div className="action-bar__total">
            <span>Total</span>
            <strong>{formatBrl(quote.grandTotal)}</strong>
          </div>
          <div className="action-bar__buttons">
            <IconAction
              label="Prévia do PDF"
              disabled={busy || quote.items.length === 0}
              onClick={() => void onPreviewPdf()}
            >
              <EyeIcon />
            </IconAction>
            {readOnly ? (
              <button
                type="button"
                className="btn primary action-bar__send"
                disabled={busy}
                onClick={() => setSendOpen(true)}
              >
                <ShareIcon />
                <span>Enviar</span>
              </button>
            ) : (
              <div className="emit-wrap">
                <ActionButton
                  label="Emitir"
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
          </div>
        </div>
      </footer>

      {pdfPreviewBlob && (
        <Modal className="modal--pdf" title="Prévia do PDF" onClose={closePdfPreview}>
          <PdfPreview data={pdfPreviewBlob} />
          {readOnly ? (
            <div className="modal__actions modal__actions--pdf">
              <button
                type="button"
                className="btn primary action-bar__send"
                disabled={busy}
                onClick={() => {
                  closePdfPreview()
                  setSendOpen(true)
                }}
              >
                <ShareIcon />
                <span>Enviar</span>
              </button>
            </div>
          ) : (
            <p className="muted catalog-hint">Rascunho. Emita o orçamento para enviar.</p>
          )}
        </Modal>
      )}

      {sendOpen && readOnly && (
        <SendSheet
          canSharePdf={pdfShareSupported}
          onClose={() => setSendOpen(false)}
          onSharePdf={() => {
            void onSharePdf()
            setSendOpen(false)
          }}
          onText={() => {
            setSendOpen(false)
            openSharePreview()
          }}
          onDownloadPdf={() => {
            setSendOpen(false)
            void onDownloadPdf()
          }}
        />
      )}

      {shareText && (
        <WhatsAppShareModal
          text={shareText}
          onClose={() => setShareText(null)}
          onSend={() => void confirmShare()}
        />
      )}
    </div>
  )
}

function CustomerSection({
  customer,
  disabled,
  storeDdd,
  onChange,
}: {
  customer: CustomerInfo
  disabled: boolean
  storeDdd?: string
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
          {!hasName && !disabled && <span className="missing-flag">Preencha o nome!</span>}
        </>
      }
      defaultOpen={!hasName}
      className="customer-section"
    >
      <div className="grid">
        <div className="field-pair field-pair--name full">
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
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder={storeDdd ? `(${storeDdd}) 99999-9999` : '(00) 00000-0000'}
              value={formatPhone(customer.phone)}
              onChange={(e) => onChange({ ...customer, phone: phoneDigits(e.target.value) })}
              onBlur={(e) => {
                const current = customerRef.current
                const phone = withDefaultDdd(e.currentTarget.value, storeDdd)
                if (phone !== (current.phone ?? '')) onChange({ ...current, phone })
              }}
            />
          </label>
        </div>
        <div className="field-pair field-pair--cep full">
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
              autoCapitalize="characters"
              value={customer.state ?? ''}
              onChange={(e) =>
                onChange({ ...customer, state: filterUfInput(e.target.value, customer.state) })
              }
              onBlur={(e) => {
                const current = customerRef.current
                if (e.currentTarget.value && !isValidUf(e.currentTarget.value)) {
                  onChange({ ...current, state: '' })
                }
              }}
            />
          </label>
        </div>
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
        <div className="field-pair field-pair--number full">
          <label>
            Número
            <input
              disabled={disabled}
              inputMode="numeric"
              value={customer.number ?? ''}
              onChange={(e) => onChange({ ...customer, number: digitsOnly(e.target.value, 6) })}
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
        </div>
        <div className="field-pair field-pair--city full">
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
        </div>
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

function WhatsAppShareModal({
  text,
  onClose,
  onSend,
}: {
  text: string
  onClose: () => void
  onSend: () => void
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    const ok = await writeClipboard(text)
    if (!ok) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <Modal className="modal--zap" title="Enviar no WhatsApp" onClose={onClose}>
      <p className="muted catalog-hint">Prévia da mensagem. O negrito sai no WhatsApp.</p>
      <div className="zap-preview">
        <button
          type="button"
          className="icon-btn zap-preview__copy"
          aria-label={copied ? 'Texto copiado' : 'Copiar texto'}
          onClick={() => void copy()}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
        <div className="zap-preview__scroll">
          {text.split('\n').map((line, index) => (
            <p key={index}>{renderZapLine(line)}</p>
          ))}
        </div>
      </div>
      <div className="modal__actions">
        <button type="button" className="btn zap-copy" onClick={() => void copy()}>
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? 'Copiado' : 'Copiar texto'}
        </button>
        <button
          type="button"
          className="btn primary zap-send"
          aria-label="Enviar no WhatsApp"
          onClick={onSend}
        >
          <WhatsAppIcon />
          <span>
            Enviar<span className="zap-send__long"> no WhatsApp</span>
          </span>
        </button>
      </div>
    </Modal>
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
  const parts = line.split(/(\*[^*]+\*|_[^_]+_)/g)
  return parts.map((part, index) => {
    if (part.length <= 2) return part
    if (part.startsWith('*') && part.endsWith('*')) return <strong key={index}>{part.slice(1, -1)}</strong>
    if (part.startsWith('_') && part.endsWith('_')) return <em key={index}>{part.slice(1, -1)}</em>
    return part
  })
}

function SendSheet({
  canSharePdf,
  onClose,
  onSharePdf,
  onText,
  onDownloadPdf,
}: {
  canSharePdf: boolean
  onClose: () => void
  onSharePdf: () => void
  onText: () => void
  onDownloadPdf: () => void
}) {
  return (
    <Modal className="modal--send" title="Enviar orçamento" onClose={onClose}>
      <div className="send-options">
        {canSharePdf && (
          <button type="button" className="send-option" onClick={onSharePdf}>
            <span className="send-option__icon"><ShareIcon /></span>
            <span className="send-option__text">
              <strong>Compartilhar PDF</strong>
              <small>WhatsApp, e-mail e outros apps</small>
            </span>
          </button>
        )}
        <button type="button" className="send-option" onClick={onText}>
          <span className="send-option__icon send-option__icon--zap"><WhatsAppIcon /></span>
          <span className="send-option__text">
            <strong>Texto</strong>
            <small>Prévia da mensagem, copiar ou enviar</small>
          </span>
        </button>
        <button type="button" className="send-option" onClick={onDownloadPdf}>
          <span className="send-option__icon"><DownloadIcon /></span>
          <span className="send-option__text">
            <strong>Baixar PDF</strong>
            <small>Salvar o arquivo no aparelho</small>
          </span>
        </button>
      </div>
    </Modal>
  )
}

function IconAction({
  label,
  disabled,
  className,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  className?: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`btn btn-icon${className ? ` ${className}` : ''}`}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

const STROKE_ICON = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

function EyeIcon() {
  return (
    <svg {...STROKE_ICON}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg {...STROKE_ICON}>
      <path d="M12 4v11M7 10.5l5 5 5-5M4.5 19.5h15" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg {...STROKE_ICON}>
      <path d="M12 3.5v11M8 7.5l4-4 4 4M8.5 10.5H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1.5" />
    </svg>
  )
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

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M19 12H5M11 6l-6 6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function RevisionIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="8" y="8" width="12.5" height="12.5" rx="2" />
      <path d="M4.5 15.5V5.5a2 2 0 0 1 2-2h9.5M14.25 11.5v5.5M11.5 14.25h5.5" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 6.5h16M9.5 6.5V4.8c0-.7.6-1.3 1.3-1.3h2.4c.7 0 1.3.6 1.3 1.3v1.7M6.2 6.5l.8 12.3c.1 1 .9 1.7 1.9 1.7h6.2c1 0 1.8-.7 1.9-1.7l.8-12.3M10 10.5v6M14 10.5v6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
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
        {costs.map((c) => (
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
                  aria-label={`Excluir ${c.label}`}
                  onClick={() => onChange(costs.filter((x) => x.id !== c.id))}
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
            placeholder="Ex.: Frete"
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

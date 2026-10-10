import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type {
  AdditionalCost,
  AppSettings,
  Catalog,
  CatalogRef,
  CustomerInfo,
  ItemInput,
  LaborKey,
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
  pdfShareMessage,
  emitQuote,
  dropEmptyFreight,
  formatBrl,
  formatQuoteCode,
  quotePdfFilename,
  quoteShareText,
  recomputeTotals,
  refreshItemDetail,
  removeItem,
  repriceDraft,
  setAdditionalCosts,
  setDiscounts,
  setCustomer,
  setItemLaborRate,
  setPriceOverride,
  shopDisplayName,
  updateItem,
} from '../domain/quote'
import { useAccess } from '../auth/access'
import {
  clearCreateDraft,
  clearEditDraft,
  clearItemDrafts,
  pruneItemDrafts,
  readItemDraft,
  saveCreateDraft,
  saveEditDraft,
  type ItemDraftRecord,
  type ItemFormState,
} from '../data/itemDraft'
import { createRepository } from '../data/repository'
import { digitsOnly, formatCep, lookupCep } from '../data/viacep'
import {
  filterUfInput,
  formatPhone,
  isValidUf,
  phoneDdd,
  parseMoneyBr,
  phoneDigits,
  withDefaultDdd,
} from '../domain/brazil'
import { bumpCatalogVersion, sameRef, setCatalogPrice, withPriceOverrides } from '../domain/catalogEdit'
import {
  downloadBlob,
  generateQuotePdf,
  shareOrDownloadPdf,
  canSharePdfFiles,
  shareQuoteText,
} from '../pdf/generateQuotePdf'
import { CatalogEditor } from './CatalogEditor'
import { AppHeader, HeaderMenu, type AppSection } from './AppHeader'
import { useDismiss } from './useDismiss'
import { motionMs, Presence, usePresence } from './usePresence'
import { useScrollEdges } from './useScrollEdges'
import { CollapsibleSection } from './CollapsibleSection'
import { CostDetailModal } from './CostDetailModal'
import { Dropdown } from './Dropdown'
import { SearchField } from './SearchField'
import { ITEM_KINDS, ItemForm } from './ItemForm'
import { ItemBlockHead } from './ItemBlockHead'
import { Modal } from './Modal'
import { PdfPreview } from './PdfPreview'
import { SettingsEditor } from './SettingsEditor'
import { HomeScreen } from './HomeScreen'
import { getRoute, goTop, push, replace, up } from '../nav/navigator'
import type { Route } from '../nav/routes'
import { useBackLayer } from '../nav/useBackLayer'
import { useRoute } from '../nav/useRoute'

const repo = createRepository()
const pdfShareSupported = canSharePdfFiles()

const kindLabel = (kind: ProductKind) => ITEM_KINDS.find((k) => k.id === kind)?.label ?? kind

const SECTION_ROUTES: Record<AppSection, Route> = {
  home: { screen: 'home' },
  list: { screen: 'quotes' },
  catalog: { screen: 'catalog', tab: 'vidros' },
  settings: { screen: 'settings', tab: 'register' },
}

export function App() {
  const access = useAccess()
  const isAdmin = access.role !== 'vendedor'
  const { route, nav } = useRoute()
  const screenKey = route.screen
  const navRef = useRef(nav)
  navRef.current = nav
  const screenRef = useRef<HTMLDivElement>(null)
  const listScrollRef = useRef(0)
  useScrollEdges()

  // Only while the list is the current route: the clamp after switching screens does not count.
  useEffect(() => {
    if (screenKey !== 'quotes') return
    const onScroll = () => {
      if (getRoute().route.screen === 'quotes') listScrollRef.current = window.scrollY
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [screenKey])

  // data-nav lives on the DOM only for the enter animation, so later children do not slide in.
  useLayoutEffect(() => {
    window.scrollTo(0, screenKey === 'quotes' ? listScrollRef.current : 0)
    const el = screenRef.current
    const enter = navRef.current
    if (!el || !enter) return
    el.dataset.nav = enter
    const id = window.setTimeout(() => delete el.dataset.nav, motionMs('lg'))
    return () => window.clearTimeout(id)
  }, [screenKey])
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
  const [itemDraft, setItemDraft] = useState<ItemDraftRecord | null>(null)
  const itemFormRef = useRef<{ state: ItemFormState; dirty: boolean } | null>(null)
  /** Bumped to remount the item form after "Descartar alterações". */
  const [itemFormVersion, setItemFormVersion] = useState(0)
  const [costItemId, setCostItemId] = useState<string | null>(null)
  const [pdfPreviewBlob, setPdfPreviewBlob] = useState<Blob | null>(null)
  const pdfCacheRef = useRef<{ key: string; promise: Promise<Blob>; blob?: Blob } | null>(null)
  const [shareText, setShareText] = useState<string | null>(null)
  const [shareFailed, setShareFailed] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [listQuery, setListQuery] = useState(() => (route.screen === 'quotes' ? (route.q ?? '') : ''))
  const [listStatus, setListStatus] = useState<'all' | 'emitted' | 'draft'>(() =>
    route.screen === 'quotes' ? (route.filter ?? 'all') : 'all',
  )
  const [notice, setNotice] = useState<string | null>(null)
  const dropQuoteOnLeaveRef = useRef(false)
  /** Quote set in state right before its route is pushed (the route may render first). */
  const openingRef = useRef<string | null>(null)
  /** Items that kept their old price after "Atualizar valores"; null = no note. */
  const [repriceFailed, setRepriceFailed] = useState<number | null>(null)
  const marginMode: MarginMode = settings?.marginMode ?? 'empresa'
  const quoteCatalog = useMemo(
    () => (catalog ? withPriceOverrides(catalog, quote?.priceOverrides) : null),
    [catalog, quote?.priceOverrides],
  )

  const refresh = async () => {
    const [c, list, s] = await Promise.all([
      repo.getCatalog(),
      repo.listQuotes(),
      repo.getSettings(),
    ])
    setCatalog(c)
    setQuotes(list)
    setSettings(s)
    return list
  }

  const bootedRef = useRef(false)
  useEffect(() => {
    const onList = screenKey === 'quotes' || screenKey === 'home'
    if (bootedRef.current && !onList) return
    bootedRef.current = true
    void refresh()
      .then((list) => {
        if (onList) pruneItemDrafts(new Set(list.map((q) => q.id)))
      })
      .catch((e) => setError(String(e)))
  }, [screenKey])

  useEffect(() => {
    if (screenKey !== 'quotes') return
    return () => setNotice(null)
  }, [screenKey])

  useEffect(() => {
    if (screenKey !== 'quotes') return
    const id = window.setTimeout(() => {
      const q = listQuery.trim()
      replace({
        screen: 'quotes',
        ...(listStatus !== 'all' ? { filter: listStatus } : {}),
        ...(q ? { q } : {}),
      })
    }, 300)
    return () => window.clearTimeout(id)
  }, [screenKey, listQuery, listStatus])

  useEffect(() => {
    if (!isAdmin && (route.screen === 'catalog' || route.screen === 'settings')) replace({ screen: 'home' })
  }, [isAdmin, route])

  const quoteId = quote?.id
  const quoteEmitted = quote?.status === 'emitted'
  useEffect(() => {
    if (!quoteId) return setItemDraft(null)
    if (quoteEmitted) {
      clearItemDrafts(quoteId)
      return setItemDraft(null)
    }
    setItemDraft(readItemDraft(quoteId))
  }, [quoteId, quoteEmitted])

  const confirmOpen =
    Boolean(pendingRemoveId) || pendingDeleteQuote || (emitNeedsName && !quote?.customer.name?.trim())
  useBackLayer(confirmOpen, () => {
    setPendingRemoveId(null)
    setPendingDeleteQuote(false)
    setEmitNeedsName(false)
  })

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

  const searchedQuotes = useMemo(() => {
    const q = listQuery.trim().toLowerCase()
    return quotes.filter((quoteRow) => {
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
  }, [quotes, listQuery])
  const emittedCount = searchedQuotes.filter((q) => q.status === 'emitted').length
  const filteredQuotes = useMemo(() => {
    if (listStatus === 'all') return searchedQuotes
    return searchedQuotes.filter((q) => (q.status === 'emitted') === (listStatus === 'emitted'))
  }, [searchedQuotes, listStatus])

  const openNew = async () => {
    if (!catalog) return
    const number = await repo.nextQuoteNumber()
    const draft = createEmptyDraft(number, catalog.config.version, marginMode)
    setItemModal(null)
    setRepriceFailed(null)
    setQuote(draft)
    openingRef.current = draft.id
    push({ screen: 'quote', id: draft.id })
    setError(null)
  }

  const loadQuote = async (id: string): Promise<boolean> => {
    const q = await repo.getQuote(id).catch(() => null)
    if (!q) return false
    setItemModal(null)
    setRepriceFailed(null)
    if (q.status === 'draft') {
      const costs = dropEmptyFreight(q.additionalCosts)
      let next = costs !== q.additionalCosts ? recomputeTotals({ ...q, additionalCosts: costs }) : q
      if (catalog) next = refreshItemDetail(next, catalog)
      if (next !== q) {
        await repo.saveQuote(next)
        setQuote(next)
        void refresh()
        return true
      }
    }
    setQuote(q)
    return true
  }

  const openQuote = async (id: string) => {
    if (!(await loadQuote(id))) return
    openingRef.current = id
    push({ screen: 'quote', id })
  }

  // Deep link, reload, browser forward: the route names a quote not loaded yet.
  useEffect(() => {
    if (route.screen !== 'quote') {
      openingRef.current = null
      if (dropQuoteOnLeaveRef.current) {
        dropQuoteOnLeaveRef.current = false
        setQuote(null)
      }
      return
    }
    if (quote?.id === route.id || openingRef.current === route.id) return
    let cancelled = false
    void loadQuote(route.id).then((found) => {
      if (cancelled || found) return
      setNotice('Orçamento não encontrado.')
      replace({ screen: 'quotes' }, 'fade')
    })
    return () => {
      cancelled = true
    }
    // loadQuote reads catalog only to refresh item details; the route is the trigger.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [route])

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
      setItemDraft(clearCreateDraft(quote.id))
      itemFormRef.current = null
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
      setItemDraft(clearEditDraft(quote.id, itemId))
      itemFormRef.current = null
      setItemModal(null)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const onRemoveItem = async (itemId: string) => {
    if (!quote) return
    if (itemModal?.mode === 'edit' && itemModal.id === itemId) setItemModal(null)
    setItemDraft(clearEditDraft(quote.id, itemId))
    await persist(removeItem(quote, itemId))
  }

  const onRepriceDraft = async () => {
    if (!quote || !catalog) return
    const { quote: next, failed } = repriceDraft(quote, catalog, marginMode)
    await persist(next)
    setRepriceFailed(failed)
  }

  const onSetPriceOverride = async (ref: CatalogRef, price: number | null) => {
    if (!quote || !catalog) return
    await persist(setPriceOverride(quote, catalog, ref, price, marginMode))
  }

  const onUpdateCatalogPrice = async (ref: CatalogRef, price: number) => {
    if (!quote || !catalog || !isAdmin) return
    const priced = setCatalogPrice(catalog, ref, price)
    const next: Catalog = {
      ...priced,
      config: { ...priced.config, version: bumpCatalogVersion(priced.config.version) },
    }
    await repo.saveCatalog(next)
    setCatalog(next)
    const own = quote.priceOverrides?.filter((o) => !sameRef(o.ref, ref))
    await persist(repriceDraft({ ...quote, priceOverrides: own }, next, marginMode).quote)
  }

  const onSetLaborRate = async (itemId: string, rate: number | null) => {
    if (!quote || !catalog) return
    await persist(setItemLaborRate(quote, catalog, itemId, rate, marginMode))
  }

  const onUpdateLaborCatalog = async (itemId: string, key: LaborKey, rate: number) => {
    if (!quote || !catalog || !isAdmin) return
    const next: Catalog = {
      ...catalog,
      config: {
        ...catalog.config,
        labor: { ...catalog.config.labor, [key]: rate },
        version: bumpCatalogVersion(catalog.config.version),
      },
    }
    await repo.saveCatalog(next)
    setCatalog(next)
    const items = quote.items.map((i) => {
      if (i.id !== itemId || i.input.kind === 'custom') return i
      const { laborRate: _own, ...input } = i.input
      return { ...i, input }
    })
    await persist(repriceDraft({ ...quote, items }, next, marginMode).quote)
  }

  const onDeleteDraft = async () => {
    if (!quote || quote.status !== 'draft') return
    setPendingDeleteQuote(false)
    await repo.deleteQuote(quote.id)
    clearItemDrafts(quote.id)
    setItemModal(null)
    dropQuoteOnLeaveRef.current = true
    up()
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
    const message = pdfShareMessage(quote, {
      shopName: shopDisplayName(settings?.establishment),
      cta: settings?.shareCta,
    })
    const ready = readyPdfBlob(quote)
    try {
      if (ready) {
        await shareOrDownloadPdf(ready, filename, message)
      } else {
        setBusy(true)
        await shareOrDownloadPdf(await getPdfBlob(quote), filename, message)
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
    setShareText(
      quoteShareText(quote, {
        shopName: shopDisplayName(settings?.establishment),
        cta: settings?.shareCta,
        validityDays: settings?.quoteValidityDays,
      }),
    )
  }

  const confirmShare = async () => {
    if (!shareText) return
    setShareFailed(false)
    if ((await shareQuoteText(shareText)) === 'failed') {
      setShareFailed(true)
      return
    }
    setShareText(null)
  }

  const closeShareText = () => {
    setShareText(null)
    setShareFailed(false)
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
      clearItemDrafts(quote.id)
      setItemDraft(null)
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
    if (!isAdmin && (section === 'catalog' || section === 'settings')) return
    goTop(SECTION_ROUTES[section])
  }

  const screen = (node: ReactNode) => (
    <div key={screenKey} ref={screenRef} className="screen">
      {node}
    </div>
  )

  if (route.screen === 'home') {
    return screen(
      <HomeScreen
        quotes={quotes}
        catalogVersion={catalog.config.version}
        settings={settings}
        isAdmin={isAdmin}
        onNavigate={goSection}
        onOpen={(target) => (target.screen === 'home' ? goSection('home') : push(target, 'fade'))}
      />,
    )
  }

  if (route.screen === 'catalog') {
    if (!isAdmin) return null
    return screen(
      <CatalogEditor
        catalog={catalog}
        marginMode={marginMode}
        tab={route.tab}
        onTabChange={(tab) => replace({ screen: 'catalog', tab })}
        onSave={onSaveCatalog}
        onNavigate={goSection}
      />,
    )
  }

  if (route.screen === 'settings') {
    if (!isAdmin) return null
    return screen(
      <SettingsEditor
        settings={settings}
        tab={route.tab}
        onTabChange={(tab) => replace({ screen: 'settings', tab })}
        onSave={onSaveSettings}
        onNavigate={goSection}
      />,
    )
  }

  if (route.screen === 'quotes') {
    return screen(
      <div className="shell shell--wide shell--with-bar">
        <div className="sticky-head">
          <AppHeader title="Orçamentos" current="list" onNavigate={goSection} onBack={up} />
        </div>

        {notice && (
          <div className="banner warn" role="status">
            {notice}
          </div>
        )}

        <section aria-label="Orçamentos">
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
                  { value: 'all', label: `Todos (${searchedQuotes.length})` },
                  { value: 'emitted', label: `Emitidos (${emittedCount})` },
                  { value: 'draft', label: `Rascunhos (${searchedQuotes.length - emittedCount})` },
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

        <footer className="action-bar">
          <div className="action-bar__inner">
            <button type="button" className="btn primary action-bar__new" onClick={() => void openNew()}>
              <PlusIcon />
              Novo orçamento
            </button>
          </div>
        </footer>
      </div>,
    )
  }

  if (!quote || quote.id !== route.id) return screen(null)

  const readOnly = quote.status === 'emitted'
  const costItem = costItemId ? quote.items.find((i) => i.id === costItemId) : undefined
  const outdated = draftOutdated(quote, catalog, marginMode)
  const outdatedDate = outdated && outdatedSince(outdated, catalog, settings?.marginModeChangedAt)
  const since = outdatedDate ? ` em ${outdatedDate.toLocaleDateString('pt-BR')}` : ''
  const editingItem =
    itemModal?.mode === 'edit' ? quote.items.find((i) => i.id === itemModal.id) : undefined
  const closeItemModal = () => {
    itemFormRef.current = null
    setItemModal(null)
    setError(null)
  }
  /** Back, Esc, Fechar, outside tap: what was typed stays as an item draft. */
  const keepItemModal = () => {
    const form = itemFormRef.current
    if (form && itemModal?.mode === 'create') {
      setItemDraft(form.dirty ? saveCreateDraft(quote.id, form.state) : clearCreateDraft(quote.id))
    } else if (form && itemModal?.mode === 'edit') {
      setItemDraft(
        form.dirty
          ? saveEditDraft(quote.id, itemModal.id, form.state)
          : clearEditDraft(quote.id, itemModal.id),
      )
    }
    closeItemModal()
  }
  /** "Cancelar" discards on purpose. */
  const discardItemModal = () => {
    if (itemModal?.mode === 'create') setItemDraft(clearCreateDraft(quote.id))
    else if (itemModal?.mode === 'edit') setItemDraft(clearEditDraft(quote.id, itemModal.id))
    closeItemModal()
  }
  const createDraft = itemDraft?.create
  const editDraft = itemModal?.mode === 'edit' ? itemDraft?.edits[itemModal.id] : undefined
  const openAddItem = () => {
    setError(null)
    setItemModal(createDraft ? { mode: 'create', kind: createDraft.kind } : { mode: 'pick' })
  }

  return screen(
    <div className="shell shell--with-bar">
      <div className="sticky-head">
        <header className="quote-head">
          <div className="quote-head__bar">
            <button
              type="button"
              className="btn btn-icon"
              aria-label="Voltar"
              title="Voltar"
              onClick={up}
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
                <Presence open={pendingDeleteQuote}>
                  {(state) => (
                    <div className="remove-pop" role="dialog" aria-label="Excluir rascunho" data-state={state}>
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
                </Presence>
              </div>
            )}
            <HeaderMenu current="list" onNavigate={goSection} />
          </div>
        </header>
      </div>

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
            <button type="button" className="item-block__cost-btn" onClick={() => setCostItemId(item.id)}>
              Detalhes do custo
            </button>
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
                <Presence open={pendingRemoveId === item.id}>
                  {(state) => (
                    <div className="remove-pop" role="dialog" aria-label="Confirmar remoção" data-state={state}>
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
                </Presence>
              </div>
            )}
            </div>
          </article>
        ))}

        {!readOnly && createDraft && !itemModal && (
          <div className="banner warn outdated-banner item-draft-banner" role="status">
            <span>
              Item não terminado: <strong>{kindLabel(createDraft.kind)}</strong>
            </span>
            <button type="button" className="btn" onClick={openAddItem}>
              Continuar
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setItemDraft(clearCreateDraft(quote.id))}
            >
              Descartar
            </button>
          </div>
        )}

        {!readOnly && (
          <div className="items-toolbar">
            <button type="button" className="btn primary with-icon" onClick={openAddItem}>
              <PlusIcon />
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

      {costItem && (
        <CostDetailModal
          item={costItem}
          quote={quote}
          catalog={catalog}
          isAdmin={isAdmin}
          onClose={() => setCostItemId(null)}
          onSetOverride={onSetPriceOverride}
          onUpdateCatalog={onUpdateCatalogPrice}
          onRecalc={() => persist(updateItem(quote, catalog, costItem.id, costItem.input, marginMode))}
          onSetLaborRate={(rate) => onSetLaborRate(costItem.id, rate)}
          onUpdateLaborCatalog={(key, rate) => onUpdateLaborCatalog(costItem.id, key, rate)}
        />
      )}

      {!readOnly && itemModal && itemModal.mode !== 'pick' && catalog && (
        <Modal
          className="modal--item"
          title={
            itemModal.mode === 'edit'
              ? editingItem
                ? `Editar item: ${kindLabel(editingItem.input.kind)}`
                : 'Editar item'
              : `Novo item: ${kindLabel(itemModal.kind)}`
          }
          onClose={keepItemModal}
        >
          {error && <p className="banner error">{error}</p>}
          {editDraft && itemModal.mode === 'edit' && (
            <div className="banner warn outdated-banner" role="status">
              <span>Alterações não salvas recuperadas.</span>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setItemDraft(clearEditDraft(quote.id, itemModal.id))
                  itemFormRef.current = null
                  setItemFormVersion((v) => v + 1)
                }}
              >
                Descartar alterações
              </button>
            </div>
          )}
          <ItemForm
            key={`${itemModal.mode === 'edit' ? itemModal.id : itemModal.kind}-${itemFormVersion}`}
            catalog={quoteCatalog ?? catalog}
            marginMode={marginMode}
            initial={editingItem?.input}
            initialState={
              itemModal.mode === 'edit'
                ? editDraft
                : createDraft?.kind === itemModal.kind
                  ? createDraft
                  : undefined
            }
            onStateChange={(state, dirty) => {
              itemFormRef.current = { state, dirty }
            }}
            lockKind={itemModal.mode === 'edit' ? editingItem?.input.kind : itemModal.kind}
            hideTitle
            submitLabel={itemModal.mode === 'edit' ? 'Salvar alterações' : 'Adicionar item'}
            onCancel={discardItemModal}
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
            <BarTotal value={quote.grandTotal} />
          </div>
          <div className="action-bar__buttons">
            <IconAction
              label="Prévia do PDF"
              disabled={busy || quote.items.length === 0}
              onClick={() => void onPreviewPdf()}
            >
              <EyeIcon />
            </IconAction>
            {readOnly && (
              <IconAction label="Baixar PDF" disabled={busy} onClick={() => void onDownloadPdf()}>
                <DownloadIcon />
              </IconAction>
            )}
            {readOnly ? (
              <SendMenu
                open={sendOpen}
                disabled={busy}
                canSharePdf={pdfShareSupported}
                onOpenChange={setSendOpen}
                onSharePdf={() => {
                  setSendOpen(false)
                  void onSharePdf()
                }}
                onText={() => {
                  setSendOpen(false)
                  openSharePreview()
                }}
              />
            ) : (
              <div className="emit-wrap">
                <ActionButton
                  label="Emitir"
                  icon={<CheckIcon />}
                  hint={
                    quote.items.length === 0
                      ? 'Inclua ao menos um item para emitir.'
                      : 'Finaliza o orçamento e libera baixar e enviar.'
                  }
                  className="primary"
                  disabled={busy || quote.items.length === 0}
                  onClick={() => void onEmit()}
                />
                <Presence open={emitNeedsName && !quote.customer.name?.trim()}>
                  {(state) => (
                    <div
                      className="remove-pop emit-pop"
                      role="alertdialog"
                      aria-label="Nome do cliente obrigatório"
                      data-state={state}
                    >
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
                </Presence>
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

      {shareText && (
        <WhatsAppShareModal
          text={shareText}
          failed={shareFailed}
          onClose={closeShareText}
          onSend={() => void confirmShare()}
        />
      )}
    </div>,
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
  failed,
  onClose,
  onSend,
}: {
  text: string
  failed: boolean
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
    <Modal className="modal--zap" title="Enviar texto" onClose={onClose}>
      <p className="muted catalog-hint">Prévia da mensagem. O negrito sai no WhatsApp.</p>
      <div className="zap-preview">
        <div className="zap-preview__scroll">
          {text.split('\n').map((line, index) => (
            <p key={index}>{renderZapLine(line)}</p>
          ))}
        </div>
      </div>
      {failed && (
        <div className="banner error" role="alert">
          Não foi possível compartilhar no momento. Faça o download do orçamento para realizar o envio.
        </div>
      )}
      <div className="modal__actions">
        <button type="button" className="btn zap-copy" onClick={() => void copy()}>
          {copied ? 'Copiado' : 'Copiar'}
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
        <button
          type="button"
          className="btn primary zap zap-send"
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

function BarTotal({ value }: { value: number }) {
  const text = formatBrl(value)
  const comma = text.lastIndexOf(',')
  if (comma < 0) return <strong>{text}</strong>
  return (
    <strong>
      {text.slice(0, comma)}
      <span className="action-bar__cents">{text.slice(comma)}</span>
    </strong>
  )
}

function SendMenu({
  open,
  disabled,
  canSharePdf,
  onOpenChange,
  onSharePdf,
  onText,
}: {
  open: boolean
  disabled: boolean
  canSharePdf: boolean
  onOpenChange: (open: boolean) => void
  onSharePdf: () => void
  onText: () => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const firstRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const pop = usePresence(open, 'xs')

  useDismiss(open, wrapRef, (reason) => {
    onOpenChange(false)
    if (reason === 'escape') buttonRef.current?.focus({ preventScroll: true })
  })

  useEffect(() => {
    if (open) firstRef.current?.focus({ preventScroll: true })
  }, [open])

  return (
    <div className="send-wrap" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="btn primary action-bar__send"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => onOpenChange(!open)}
      >
        <ShareIcon />
        <span>Enviar</span>
      </button>
      {pop.mounted && (
        <div className="send-pop" id={menuId} role="menu" aria-label="Enviar orçamento" data-state={pop.state}>
          <button ref={firstRef} type="button" role="menuitem" className="send-option" onClick={onSharePdf}>
            <span className="send-option__icon send-option__icon--pdf"><PdfIcon /></span>
            <span className="send-option__text">
              <strong>Enviar PDF</strong>
              <small>{canSharePdf ? 'Arquivo com a mensagem, que também é copiada' : 'Baixa o PDF e abre o WhatsApp'}</small>
            </span>
          </button>
          <button type="button" role="menuitem" className="send-option" onClick={onText}>
            <span className="send-option__icon"><TextIcon /></span>
            <span className="send-option__text">
              <strong>Enviar texto</strong>
              <small>Prévia, copiar ou enviar</small>
            </span>
          </button>
        </div>
      )}
    </div>
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

function PdfIcon() {
  return (
    <svg {...STROKE_ICON}>
      <path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z" />
      <path d="M14 3.5v5h5M8.5 13.5h7M8.5 17h4.5" />
    </svg>
  )
}

function TextIcon() {
  return (
    <svg {...STROKE_ICON}>
      <path d="M7 4.5h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6.5L6 20v-3.5a1.5 1.5 0 0 1-1-1.5V6.5a2 2 0 0 1 2-2z" />
      <path d="M8.5 9h7M8.5 12h4.5" />
    </svg>
  )
}

function ActionButton({
  label,
  hint,
  icon,
  disabled,
  className,
  onClick,
}: {
  label: string
  hint: string
  icon?: ReactNode
  disabled?: boolean
  className?: string
  onClick: () => void
}) {
  const classes = ['btn', className, icon ? 'with-icon' : null].filter(Boolean).join(' ')
  return (
    <span className="btn-slot" title={hint}>
      <button type="button" className={classes} disabled={disabled} onClick={onClick}>
        {icon}
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
      key={disabled ? 'read' : 'edit'}
      className="cost-section"
      title="Custos adicionais"
      badge={<span className="pill">{costs.length}</span>}
      defaultOpen={!disabled || costs.length > 0}
    >
      {disabled && costs.length === 0 && <p className="muted cost-empty">Nenhum custo adicional.</p>}
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
      className="cost-section"
      title="Descontos"
      badge={<span className="pill">{discounts.length}</span>}
    >
      {disabled && discounts.length === 0 && <p className="muted cost-empty">Nenhum desconto.</p>}
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

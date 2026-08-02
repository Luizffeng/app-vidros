import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  downloadCatalogJson,
  isCatalogItemActive,
  nextNumericId,
  parseImportedCatalog,
} from '../data/catalogItems'
import { loadSeedCatalog } from '../data/seedCatalog'
import { formatBrl } from '../domain/quote'
import type {
  Acessorio,
  Aluminio,
  Catalog,
  KitBox,
  PricingConfig,
  Vidro,
} from '../domain/types'

type Tab = 'vidros' | 'kitBox' | 'acessorios' | 'aluminios' | 'config'

const TABS: { id: Tab; label: string }[] = [
  { id: 'vidros', label: 'Vidros' },
  { id: 'kitBox', label: 'Kit Box' },
  { id: 'acessorios', label: 'Acessórios' },
  { id: 'aluminios', label: 'Alumínios' },
  { id: 'config', label: 'Mão de obra / margem' },
]

const MARGIN_LABELS: Record<keyof PricingConfig['defaultMarkup'], string> = {
  box: 'Box',
  correr: 'Correr',
  pivotante: 'Pivotante',
  maxiar: 'Maxim-ar',
  fixo: 'Vidro fixo',
  espelho: 'Espelho',
}

function cloneCatalog(catalog: Catalog): Catalog {
  return structuredClone(catalog)
}

function bumpVersion(current: string): string {
  const day = new Date().toISOString().slice(0, 10)
  if (current === day || current.startsWith(`${day}T`)) {
    return new Date().toISOString().slice(0, 16)
  }
  return day
}

function matchesQuery(query: string, parts: Array<string | number | null | undefined>) {
  if (!query.trim()) return true
  const q = query.trim().toLowerCase()
  return parts.some((p) => String(p ?? '').toLowerCase().includes(q))
}

function parseMoney(raw: string): number | null {
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

function formatMoney(value: number | null): string {
  if (value == null) return ''
  return value.toFixed(2).replace('.', ',')
}

function formatPercent(fraction: number | null): string {
  if (fraction == null) return ''
  return (fraction * 100).toFixed(2).replace('.', ',')
}

function parsePercent(raw: string): number | null {
  const pct = parseMoney(raw)
  if (pct == null) return null
  return Math.round(pct * 100) / 10000
}

export function CatalogEditor({
  catalog,
  onSave,
  onBack,
}: {
  catalog: Catalog
  onSave: (catalog: Catalog) => Promise<void>
  onBack: () => void
}) {
  const [draft, setDraft] = useState(() => cloneCatalog(catalog))
  const [tab, setTab] = useState<Tab>('vidros')
  const [query, setQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(catalog),
    [draft, catalog],
  )

  const save = async () => {
    try {
      setBusy(true)
      setError(null)
      const next: Catalog = {
        ...draft,
        config: {
          ...draft.config,
          version: bumpVersion(draft.config.version),
        },
      }
      await onSave(next)
      setDraft(cloneCatalog(next))
      setMessage(`Catálogo salvo · versão ${next.config.version}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const restoreSeed = () => {
    if (!confirm('Restaurar preços do seed inicial? Alterações locais serão perdidas.')) return
    setDraft(cloneCatalog(loadSeedCatalog()))
    setMessage('Seed carregado no editor — salve para aplicar.')
    setError(null)
  }

  const onImportFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const text = await file.text()
      const parsed = parseImportedCatalog(JSON.parse(text) as unknown)
      setDraft(parsed)
      setMessage('Catálogo importado — revise e salve para aplicar.')
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao importar JSON.')
    } finally {
      if (importRef.current) importRef.current.value = ''
    }
  }

  return (
    <div className="shell shell--wide">
      <header className="topbar">
        <button type="button" className="btn ghost" onClick={onBack}>
          ← Orçamentos
        </button>
        <div>
          <p className="brand-sm">Forte Vidros</p>
          <h1 className="title-sm">Catálogo de preços</h1>
        </div>
      </header>

      <p className="lede catalog-lede">
        Edite, crie ou desative itens. Orçamentos emitidos não mudam; novos usam a versão salva (
        {draft.config.version}).
      </p>

      {error && <div className="banner error">{error}</div>}
      {message && !error && <div className="banner ok">{message}</div>}

      <div className="catalog-toolbar">
        <div className="kind-grid" role="tablist" aria-label="Tabelas do catálogo">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`chip${tab === t.id ? ' active' : ''}`}
              onClick={() => {
                setTab(t.id)
                setQuery('')
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab !== 'config' && (
          <>
            <input
              className="catalog-search"
              placeholder="Buscar código, tipo, cor…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="kind-grid">
              <button
                type="button"
                className={`chip${!showInactive ? ' active' : ''}`}
                onClick={() => setShowInactive(false)}
              >
                Só ativos
              </button>
              <button
                type="button"
                className={`chip${showInactive ? ' active' : ''}`}
                onClick={() => setShowInactive(true)}
              >
                Incluir inativos
              </button>
            </div>
          </>
        )}
      </div>

      {tab === 'vidros' && (
        <VidrosTable
          rows={draft.vidros}
          query={query}
          showInactive={showInactive}
          onChange={(vidros) => setDraft((d) => ({ ...d, vidros }))}
        />
      )}
      {tab === 'kitBox' && (
        <KitBoxTable
          rows={draft.kitBox}
          query={query}
          showInactive={showInactive}
          onChange={(kitBox) => setDraft((d) => ({ ...d, kitBox }))}
        />
      )}
      {tab === 'acessorios' && (
        <AcessoriosTable
          rows={draft.acessorios}
          query={query}
          showInactive={showInactive}
          onChange={(acessorios) => setDraft((d) => ({ ...d, acessorios }))}
        />
      )}
      {tab === 'aluminios' && (
        <AluminiosTable
          rows={draft.aluminios}
          query={query}
          showInactive={showInactive}
          onChange={(aluminios) => setDraft((d) => ({ ...d, aluminios }))}
        />
      )}
      {tab === 'config' && (
        <ConfigPanel
          config={draft.config}
          onChange={(config) => setDraft((d) => ({ ...d, config }))}
        />
      )}

      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => void onImportFile(e.target.files?.[0])}
      />

      <footer className="actions catalog-actions">
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => downloadCatalogJson(draft)}
        >
          Exportar JSON
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => importRef.current?.click()}
        >
          Importar JSON
        </button>
        <button type="button" className="btn" onClick={restoreSeed} disabled={busy}>
          Restaurar seed
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={busy || !dirty}
          onClick={() => void save()}
        >
          {busy ? 'Salvando…' : dirty ? 'Salvar catálogo' : 'Salvo'}
        </button>
      </footer>
    </div>
  )
}

function MoneyInput({
  value,
  onCommit,
  allowNull = false,
}: {
  value: number | null
  onCommit: (n: number | null) => void
  allowNull?: boolean
}) {
  const [raw, setRaw] = useState(() => formatMoney(value))

  useEffect(() => {
    setRaw(formatMoney(value))
  }, [value])

  return (
    <input
      className="money-input"
      inputMode="decimal"
      aria-label="Preço"
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={() => {
        if (allowNull && raw.trim() === '') {
          onCommit(null)
          setRaw('')
          return
        }
        const n = parseMoney(raw)
        if (n == null) {
          setRaw(formatMoney(value))
          return
        }
        onCommit(n)
        setRaw(formatMoney(n))
      }}
    />
  )
}

function PercentInput({
  value,
  onCommit,
  ariaLabel = 'Porcentagem',
}: {
  value: number
  onCommit: (fraction: number) => void
  ariaLabel?: string
}) {
  const [raw, setRaw] = useState(() => formatPercent(value))

  useEffect(() => {
    setRaw(formatPercent(value))
  }, [value])

  return (
    <div className="percent-input">
      <input
        className="money-input"
        inputMode="decimal"
        aria-label={ariaLabel}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={() => {
          const fraction = parsePercent(raw)
          if (fraction == null) {
            setRaw(formatPercent(value))
            return
          }
          onCommit(fraction)
          setRaw(formatPercent(fraction))
        }}
      />
      <span className="percent-input__suffix" aria-hidden>
        %
      </span>
    </div>
  )
}

function setAtivo<T extends { id: number; ativo?: boolean }>(
  rows: T[],
  id: number,
  ativo: boolean,
): T[] {
  return rows.map((r) => (r.id === id ? { ...r, ativo } : r))
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scrollY = window.scrollY
    const { body } = document
    const prevOverflow = body.style.overflow
    const prevPosition = body.style.position
    const prevTop = body.style.top
    const prevWidth = body.style.width

    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    // Foco no campo do formulário, sem scroll da página de fundo
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      '.modal__body input:not([type="hidden"]), .modal__body select, .modal__body textarea',
    )
    focusable?.focus({ preventScroll: true })

    return () => {
      window.removeEventListener('keydown', onKey)
      body.style.overflow = prevOverflow
      body.style.position = prevPosition
      body.style.top = prevTop
      body.style.width = prevWidth
      window.scrollTo(0, scrollY)
    }
  }, [onClose])

  return createPortal(
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <h3>{title}</h3>
          <button type="button" className="btn ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

function VidrosTable({
  rows,
  query,
  showInactive,
  onChange,
}: {
  rows: Vidro[]
  query: string
  showInactive: boolean
  onChange: (rows: Vidro[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [tipo, setTipo] = useState('Temperado')
  const [cor, setCor] = useState('Incolor')
  const [espessuraMm, setEspessuraMm] = useState('08')
  const [valorRaw, setValorRaw] = useState('')

  const filtered = rows.filter((r) => {
    if (!showInactive && !isCatalogItemActive(r)) return false
    return matchesQuery(query, [r.codigo, r.tipo, r.cor, r.espessuraMm, r.valorM2])
  })

  const resetForm = () => {
    setCodigo('')
    setTipo('Temperado')
    setCor('Incolor')
    setEspessuraMm('08')
    setValorRaw('')
  }

  const add = () => {
    const valorM2 = parseMoney(valorRaw)
    if (!codigo.trim() || !tipo.trim() || !cor.trim()) return
    if (valorM2 == null) return
    onChange([
      ...rows,
      {
        id: nextNumericId(rows),
        codigo: codigo.trim(),
        tipo: tipo.trim(),
        cor: cor.trim(),
        espessuraMm: espessuraMm.trim() || null,
        valorM2,
        ativo: true,
      },
    ])
    resetForm()
    setOpen(false)
  }

  return (
    <section className="section catalog-section">
      <div className="section-head section-head--actions">
        <div className="section-head__title">
          <h2>Vidros</h2>
          <span className="pill">{filtered.length}/{rows.length}</span>
        </div>
        <button type="button" className="btn primary" onClick={() => setOpen(true)}>
          Adicionar vidro
        </button>
      </div>
      <div className="table-wrap">
        <table className="catalog-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>Cor</th>
              <th><span className="unit">mm</span></th>
              <th>R$/<span className="unit">m²</span></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.id}
                className={isCatalogItemActive(row) ? undefined : 'catalog-row--inactive'}
              >
                <td>{row.codigo}</td>
                <td>{row.tipo}</td>
                <td>{row.cor}</td>
                <td>{row.espessuraMm ?? '—'}</td>
                <td>
                  <MoneyInput
                    value={row.valorM2}
                    allowNull
                    onCommit={(valorM2) =>
                      onChange(rows.map((r) => (r.id === row.id ? { ...r, valorM2 } : r)))
                    }
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn link"
                    onClick={() =>
                      onChange(setAtivo(rows, row.id, !isCatalogItemActive(row)))
                    }
                  >
                    {isCatalogItemActive(row) ? 'Desativar' : 'Reativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <Modal title="Novo vidro" onClose={() => { resetForm(); setOpen(false) }}>
          <div className="grid">
            <label>
              Código
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            </label>
            <label>
              Tipo
              <input value={tipo} onChange={(e) => setTipo(e.target.value)} />
            </label>
            <label>
              Cor
              <input value={cor} onChange={(e) => setCor(e.target.value)} />
            </label>
            <label>
              Espessura (mm)
              <input value={espessuraMm} onChange={(e) => setEspessuraMm(e.target.value)} />
            </label>
            <label>
              R$/m²
              <input
                className="money-input"
                inputMode="decimal"
                value={valorRaw}
                onChange={(e) => setValorRaw(e.target.value)}
                placeholder="0,00"
              />
            </label>
          </div>
          <div className="modal__actions">
            <button type="button" className="btn" onClick={() => { resetForm(); setOpen(false) }}>
              Cancelar
            </button>
            <button type="button" className="btn primary" onClick={add}>
              Adicionar vidro
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}

function KitBoxTable({
  rows,
  query,
  showInactive,
  onChange,
}: {
  rows: KitBox[]
  query: string
  showInactive: boolean
  onChange: (rows: KitBox[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [tipo, setTipo] = useState('Kit Box')
  const [cor, setCor] = useState('Fosco')
  const [tamanhoCm, setTamanhoCm] = useState('150')
  const [valorRaw, setValorRaw] = useState('')

  const filtered = rows.filter((r) => {
    if (!showInactive && !isCatalogItemActive(r)) return false
    return matchesQuery(query, [r.codigo, r.tipo, r.cor, r.tamanhoCm, r.valor])
  })

  const resetForm = () => {
    setCodigo('')
    setTipo('Kit Box')
    setCor('Fosco')
    setTamanhoCm('150')
    setValorRaw('')
  }

  const add = () => {
    const valor = parseMoney(valorRaw)
    const cm = Number(tamanhoCm.replace(',', '.'))
    if (!codigo.trim() || !tipo.trim() || !cor.trim() || Number.isNaN(cm) || valor == null) return
    onChange([
      ...rows,
      {
        id: nextNumericId(rows),
        codigo: codigo.trim(),
        tipo: tipo.trim(),
        cor: cor.trim(),
        tamanhoCm: cm,
        valor,
        ativo: true,
      },
    ])
    resetForm()
    setOpen(false)
  }

  return (
    <section className="section catalog-section">
      <div className="section-head section-head--actions">
        <div className="section-head__title">
          <h2>Kit Box</h2>
          <span className="pill">{filtered.length}/{rows.length}</span>
        </div>
        <button type="button" className="btn primary" onClick={() => setOpen(true)}>
          Adicionar kit
        </button>
      </div>
      <div className="table-wrap">
        <table className="catalog-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>Cor</th>
              <th><span className="unit">cm</span></th>
              <th>Valor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.id}
                className={isCatalogItemActive(row) ? undefined : 'catalog-row--inactive'}
              >
                <td>{row.codigo}</td>
                <td>{row.tipo}</td>
                <td>{row.cor}</td>
                <td>{row.tamanhoCm}</td>
                <td>
                  <MoneyInput
                    value={row.valor}
                    allowNull
                    onCommit={(valor) =>
                      onChange(rows.map((r) => (r.id === row.id ? { ...r, valor } : r)))
                    }
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn link"
                    onClick={() =>
                      onChange(setAtivo(rows, row.id, !isCatalogItemActive(row)))
                    }
                  >
                    {isCatalogItemActive(row) ? 'Desativar' : 'Reativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <Modal title="Novo kit box" onClose={() => { resetForm(); setOpen(false) }}>
          <div className="grid">
            <label>
              Código
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            </label>
            <label>
              Tipo
              <input value={tipo} onChange={(e) => setTipo(e.target.value)} />
            </label>
            <label>
              Cor
              <input value={cor} onChange={(e) => setCor(e.target.value)} />
            </label>
            <label>
              Tamanho (cm)
              <input value={tamanhoCm} onChange={(e) => setTamanhoCm(e.target.value)} />
            </label>
            <label>
              Valor
              <input
                className="money-input"
                inputMode="decimal"
                value={valorRaw}
                onChange={(e) => setValorRaw(e.target.value)}
                placeholder="0,00"
              />
            </label>
          </div>
          <div className="modal__actions">
            <button type="button" className="btn" onClick={() => { resetForm(); setOpen(false) }}>
              Cancelar
            </button>
            <button type="button" className="btn primary" onClick={add}>
              Adicionar kit
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}

function AcessoriosTable({
  rows,
  query,
  showInactive,
  onChange,
}: {
  rows: Acessorio[]
  query: string
  showInactive: boolean
  onChange: (rows: Acessorio[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valorRaw, setValorRaw] = useState('')

  const filtered = rows.filter((r) => {
    if (!showInactive && !isCatalogItemActive(r)) return false
    return matchesQuery(query, [r.codigo, r.descricao, r.valor])
  })

  const resetForm = () => {
    setCodigo('')
    setDescricao('')
    setValorRaw('')
  }

  const add = () => {
    const valor = parseMoney(valorRaw)
    if (!codigo.trim() || !descricao.trim() || valor == null) return
    onChange([
      ...rows,
      {
        id: nextNumericId(rows),
        codigo: codigo.trim(),
        descricao: descricao.trim(),
        valor,
        ativo: true,
      },
    ])
    resetForm()
    setOpen(false)
  }

  return (
    <section className="section catalog-section">
      <div className="section-head section-head--actions">
        <div className="section-head__title">
          <h2>Acessórios</h2>
          <span className="pill">{filtered.length}/{rows.length}</span>
        </div>
        <button type="button" className="btn primary" onClick={() => setOpen(true)}>
          Adicionar acessório
        </button>
      </div>
      <div className="table-wrap">
        <table className="catalog-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.id}
                className={isCatalogItemActive(row) ? undefined : 'catalog-row--inactive'}
              >
                <td>{row.codigo}</td>
                <td className="cell-desc">{row.descricao}</td>
                <td>
                  <MoneyInput
                    value={row.valor}
                    onCommit={(valor) =>
                      onChange(
                        rows.map((r) => (r.id === row.id ? { ...r, valor: valor ?? 0 } : r)),
                      )
                    }
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn link"
                    onClick={() =>
                      onChange(setAtivo(rows, row.id, !isCatalogItemActive(row)))
                    }
                  >
                    {isCatalogItemActive(row) ? 'Desativar' : 'Reativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <Modal title="Novo acessório" onClose={() => { resetForm(); setOpen(false) }}>
          <div className="grid">
            <label>
              Código
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            </label>
            <label className="full">
              Descrição
              <input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </label>
            <label>
              Valor
              <input
                className="money-input"
                inputMode="decimal"
                value={valorRaw}
                onChange={(e) => setValorRaw(e.target.value)}
                placeholder="0,00"
              />
            </label>
          </div>
          <div className="modal__actions">
            <button type="button" className="btn" onClick={() => { resetForm(); setOpen(false) }}>
              Cancelar
            </button>
            <button type="button" className="btn primary" onClick={add}>
              Adicionar acessório
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}

function AluminiosTable({
  rows,
  query,
  showInactive,
  onChange,
}: {
  rows: Aluminio[]
  query: string
  showInactive: boolean
  onChange: (rows: Aluminio[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [metragem, setMetragem] = useState('6')
  const [valorRaw, setValorRaw] = useState('')

  const filtered = rows.filter((r) => {
    if (!showInactive && !isCatalogItemActive(r)) return false
    return matchesQuery(query, [r.codigo, r.descricao, r.valorBarra, r.valorMetro])
  })

  const resetForm = () => {
    setCodigo('')
    setDescricao('')
    setMetragem('6')
    setValorRaw('')
  }

  const add = () => {
    const valorBarra = parseMoney(valorRaw)
    const metragemBarra = Number(metragem.replace(',', '.'))
    if (!codigo.trim() || valorBarra == null || !(metragemBarra > 0)) return
    const valorMetro = Math.round((valorBarra / metragemBarra) * 100) / 100
    onChange([
      ...rows,
      {
        id: nextNumericId(rows),
        codigo: codigo.trim(),
        descricao: descricao.trim() || null,
        valorBarra,
        metragemBarra,
        valorMetro,
        ativo: true,
      },
    ])
    resetForm()
    setOpen(false)
  }

  return (
    <section className="section catalog-section">
      <div className="section-head section-head--actions">
        <div className="section-head__title">
          <h2>Alumínios</h2>
          <span className="pill">{filtered.length}/{rows.length}</span>
        </div>
        <button type="button" className="btn primary" onClick={() => setOpen(true)}>
          Adicionar alumínio
        </button>
      </div>
      <p className="muted catalog-hint">
        Edite valor da barra; R$/m recalcula com metragem da barra.
      </p>
      <div className="table-wrap">
        <table className="catalog-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descrição</th>
              <th>Tamanho da barra [<span className="unit">m</span>]</th>
              <th>R$ barra</th>
              <th>R$/<span className="unit">m</span></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.id}
                className={isCatalogItemActive(row) ? undefined : 'catalog-row--inactive'}
              >
                <td>{row.codigo}</td>
                <td className="cell-desc">{row.descricao ?? '—'}</td>
                <td>{row.metragemBarra}</td>
                <td>
                  <MoneyInput
                    value={row.valorBarra}
                    onCommit={(valorBarra) => {
                      const v = valorBarra ?? 0
                      const valorMetro =
                        row.metragemBarra > 0 ? Math.round((v / row.metragemBarra) * 100) / 100 : 0
                      onChange(
                        rows.map((r) =>
                          r.id === row.id ? { ...r, valorBarra: v, valorMetro } : r,
                        ),
                      )
                    }}
                  />
                </td>
                <td>{formatBrl(row.valorMetro)}</td>
                <td>
                  <button
                    type="button"
                    className="btn link"
                    onClick={() =>
                      onChange(setAtivo(rows, row.id, !isCatalogItemActive(row)))
                    }
                  >
                    {isCatalogItemActive(row) ? 'Desativar' : 'Reativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <Modal title="Novo alumínio" onClose={() => { resetForm(); setOpen(false) }}>
          <div className="grid">
            <label>
              Código
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            </label>
            <label className="full">
              Descrição
              <input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </label>
            <label>
              Barra (m)
              <input value={metragem} onChange={(e) => setMetragem(e.target.value)} />
            </label>
            <label>
              R$ barra
              <input
                className="money-input"
                inputMode="decimal"
                value={valorRaw}
                onChange={(e) => setValorRaw(e.target.value)}
                placeholder="0,00"
              />
            </label>
          </div>
          <div className="modal__actions">
            <button type="button" className="btn" onClick={() => { resetForm(); setOpen(false) }}>
              Cancelar
            </button>
            <button type="button" className="btn primary" onClick={add}>
              Adicionar alumínio
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}

function ConfigPanel({
  config,
  onChange,
}: {
  config: PricingConfig
  onChange: (config: PricingConfig) => void
}) {
  const setLabor = (key: keyof PricingConfig['labor'], value: number) => {
    onChange({ ...config, labor: { ...config.labor, [key]: value } })
  }
  const setMarkup = (key: keyof PricingConfig['defaultMarkup'], value: number) => {
    onChange({
      ...config,
      defaultMarkup: { ...config.defaultMarkup, [key]: value },
    })
  }

  return (
    <section className="section catalog-section">
      <h2>Mão de obra</h2>
      <div className="grid">
        <label>
          Box avulso (R$)
          <MoneyInput
            value={config.labor.boxAvulso}
            onCommit={(n) => n != null && setLabor('boxAvulso', n)}
          />
        </label>
        <label>
          Box por m² (R$)
          <MoneyInput
            value={config.labor.boxPerM2}
            onCommit={(n) => n != null && setLabor('boxPerM2', n)}
          />
        </label>
        <label>
          Temperado por m² (R$)
          <MoneyInput
            value={config.labor.temperedPerM2}
            onCommit={(n) => n != null && setLabor('temperedPerM2', n)}
          />
        </label>
        <label>
          Maxim-ar avulso (R$)
          <MoneyInput
            value={config.labor.maxiarAvulso}
            onCommit={(n) => n != null && setLabor('maxiarAvulso', n)}
          />
        </label>
      </div>

      <h2 className="catalog-subhead">Margem padrão</h2>
      <div className="grid">
        {(Object.keys(config.defaultMarkup) as Array<keyof PricingConfig['defaultMarkup']>).map(
          (key) => {
            const label = MARGIN_LABELS[key]
            return (
              <label key={key}>
                {label}
                <PercentInput
                  value={config.defaultMarkup[key]}
                  ariaLabel={`Margem ${label}`}
                  onCommit={(n) => setMarkup(key, n)}
                />
              </label>
            )
          },
        )}
      </div>

      <h2 className="catalog-subhead">Acréscimo cor do alumínio</h2>
      <div className="table-wrap">
        <table className="catalog-table">
          <thead>
            <tr>
              <th>Cor</th>
              <th>Acréscimo (%)</th>
            </tr>
          </thead>
          <tbody>
            {config.aluminumColors.map((row, idx) => (
              <tr key={row.color}>
                <td>{row.color}</td>
                <td>
                  <PercentInput
                    value={row.surcharge}
                    ariaLabel={`Acréscimo ${row.color}`}
                    onCommit={(surcharge) => {
                      const aluminumColors = config.aluminumColors.map((c, i) =>
                        i === idx ? { ...c, surcharge } : c,
                      )
                      onChange({ ...config, aluminumColors })
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

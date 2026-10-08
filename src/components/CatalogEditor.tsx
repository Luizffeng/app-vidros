import { useEffect, useMemo, useState } from 'react'
import { isCatalogItemActive, nextNumericId } from '../data/catalogItems'
import { aluminioValorMetro, bumpCatalogVersion } from '../domain/catalogEdit'
import type {
  Acessorio,
  Aluminio,
  Catalog,
  KitBox,
  MarginMode,
  PricingConfig,
  Vidro,
} from '../domain/types'
import { AppHeader, type AppSection } from './AppHeader'
import { Dropdown } from './Dropdown'
import { Modal } from './Modal'
import { SearchField } from './SearchField'

type Tab = 'vidros' | 'kitBox' | 'acessorios' | 'aluminios' | 'config'

const TABS: { value: Tab; label: string }[] = [
  { value: 'vidros', label: 'Vidros' },
  { value: 'kitBox', label: 'Kit Box' },
  { value: 'acessorios', label: 'Acessórios' },
  { value: 'aluminios', label: 'Alumínios' },
  { value: 'config', label: 'Mão de obra / margem' },
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
  marginMode,
  onSave,
  onNavigate,
}: {
  catalog: Catalog
  marginMode: MarginMode
  onSave: (catalog: Catalog) => Promise<void>
  onNavigate: (section: AppSection) => void
}) {
  const [draft, setDraft] = useState(() => cloneCatalog(catalog))
  const [tab, setTab] = useState<Tab>('vidros')
  const [query, setQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
          version: bumpCatalogVersion(draft.config.version),
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

  const discardChanges = () => {
    if (!confirm('Descartar as alterações não salvas do catálogo?')) return
    setDraft(cloneCatalog(catalog))
    setMessage(null)
    setError(null)
  }

  return (
    <div className="shell shell--wide shell--with-bar">
      <div className="sticky-head">
        <AppHeader title="Catálogo" current="catalog" onNavigate={onNavigate} />
      </div>

      <p className="lede catalog-lede">
        Edite, crie ou desative itens. Orçamentos emitidos não serão alterados!
      </p>

      {error && <div className="banner error">{error}</div>}
      {message && !error && <div className="banner ok">{message}</div>}

      <div className="catalog-toolbar">
        <Dropdown
          className="catalog-kind"
          label="Tabela do catálogo"
          value={tab}
          onChange={(next) => {
            setTab(next)
            setQuery('')
          }}
          options={TABS}
        />
        {tab !== 'config' && (
          <div className="list-filters catalog-filters">
            <SearchField
              label="Buscar por código, tipo ou cor"
              value={query}
              onChange={setQuery}
            />
            <Dropdown
              className="list-status"
              label="Filtrar por situação"
              value={showInactive ? 'all' : 'active'}
              onChange={(v) => setShowInactive(v === 'all')}
              options={[
                { value: 'active', label: 'Só ativos' },
                { value: 'all', label: 'Todos' },
              ]}
            />
          </div>
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
          showMarkup={marginMode !== 'autonomo'}
          onChange={(config) => setDraft((d) => ({ ...d, config }))}
        />
      )}

      <footer className="action-bar">
        <div className="action-bar__inner action-bar__inner--pair">
          <button type="button" className="btn" disabled={busy || !dirty} onClick={discardChanges}>
            Resetar mudanças
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={busy || !dirty}
            onClick={() => void save()}
          >
            {busy ? 'Salvando…' : dirty ? 'Salvar' : 'Salvo'}
          </button>
        </div>
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

function ActiveToggle({
  active,
  code,
  onToggle,
}: {
  active: boolean
  code: string
  onToggle: () => void
}) {
  const label = active ? `Desativar ${code}` : `Reativar ${code}`
  return (
    <button
      type="button"
      className={`catalog-toggle${active ? ' catalog-toggle--on' : ''}`}
      aria-label={label}
      title={label}
      onClick={onToggle}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {active ? (
          <>
            <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
            <circle cx="12" cy="12" r="3" />
          </>
        ) : (
          <>
            <path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.4 6.9C3.9 8.6 2.5 12 2.5 12S6 18.5 12 18.5c1.9 0 3.5-.6 4.9-1.5" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3.5 3.5l17 17" />
          </>
        )}
      </svg>
    </button>
  )
}

function setAtivo<T extends { id: number; ativo?: boolean }>(
  rows: T[],
  id: number,
  ativo: boolean,
): T[] {
  return rows.map((r) => (r.id === id ? { ...r, ativo } : r))
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
                <td className="cell-toggle">
                  <ActiveToggle
                    active={isCatalogItemActive(row)}
                    code={row.codigo}
                    onToggle={() => onChange(setAtivo(rows, row.id, !isCatalogItemActive(row)))}
                  />
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
                <td className="cell-toggle">
                  <ActiveToggle
                    active={isCatalogItemActive(row)}
                    code={row.codigo}
                    onToggle={() => onChange(setAtivo(rows, row.id, !isCatalogItemActive(row)))}
                  />
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
                <td className="cell-toggle">
                  <ActiveToggle
                    active={isCatalogItemActive(row)}
                    code={row.codigo}
                    onToggle={() => onChange(setAtivo(rows, row.id, !isCatalogItemActive(row)))}
                  />
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
    const valorMetro = aluminioValorMetro(valorBarra, metragemBarra)
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
      <div className="table-wrap">
        <table className="catalog-table catalog-table--aluminios">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descrição</th>
              <th className="cell-num">R$ barra</th>
              <th className="cell-num">
                Tamanho da barra [<span className="unit">m</span>]
              </th>
              <th className="cell-num">
                R$/<span className="unit">m</span>
              </th>
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
                <td className="cell-num cell-money-barra">
                  <MoneyInput
                    value={row.valorBarra}
                    onCommit={(valorBarra) => {
                      const v = valorBarra ?? 0
                      const valorMetro = aluminioValorMetro(v, row.metragemBarra)
                      onChange(
                        rows.map((r) =>
                          r.id === row.id ? { ...r, valorBarra: v, valorMetro } : r,
                        ),
                      )
                    }}
                  />
                </td>
                <td className="cell-num">{row.metragemBarra}</td>
                <td className="cell-num">
                  {row.valorMetro.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="cell-toggle">
                  <ActiveToggle
                    active={isCatalogItemActive(row)}
                    code={row.codigo}
                    onToggle={() => onChange(setAtivo(rows, row.id, !isCatalogItemActive(row)))}
                  />
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
  showMarkup,
  onChange,
}: {
  config: PricingConfig
  showMarkup: boolean
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

      {showMarkup && (
        <>
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
        </>
      )}

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

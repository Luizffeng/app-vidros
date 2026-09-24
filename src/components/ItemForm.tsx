import { useEffect, useMemo, useRef, useState } from 'react'
import { isCatalogItemActive } from '../domain/catalogActive'
import { priceItem } from '../domain/pricing'
import { formatBrl } from '../domain/quote'
import type {
  Catalog,
  CorrerSubtype,
  EspelhoFinish,
  ItemExtra,
  ItemInput,
  PricingConfig,
  PricingResult,
  ProductKind,
} from '../domain/types'
export const ITEM_KINDS: { id: ProductKind; label: string }[] = [
  { id: 'box', label: 'Box' },
  { id: 'correr', label: 'Correr' },
  { id: 'pivotante', label: 'Pivotante' },
  { id: 'maxiar', label: 'Maxim-ar' },
  { id: 'fixo', label: 'Vidro fixo' },
  { id: 'espelho', label: 'Espelho' },
  { id: 'custom', label: 'Avulso / texto' },
]

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

function pctStr(fraction: number): string {
  return (fraction * 100).toFixed(2).replace('.', ',')
}

function parseMoney(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function collectExtras(
  rows: { id: string; description: string; amount: string }[],
): ItemExtra[] | null {
  const out: ItemExtra[] = []
  for (const row of rows) {
    const description = row.description.trim()
    const amountRaw = row.amount.trim()
    if (!description && !amountRaw) continue
    const amount = parseMoney(amountRaw)
    if (!description || amount == null) return null
    out.push({ id: row.id, description, amount })
  }
  return out
}

type ExtraDraft = { id: string; description: string; amount: string; committed: boolean }

function blankExtra(): ExtraDraft {
  return { id: crypto.randomUUID(), description: '', amount: '', committed: false }
}

function seedExtraRows(initial?: ItemInput): ExtraDraft[] {
  const committed: ExtraDraft[] =
    !initial || initial.kind === 'custom'
      ? []
      : initial.extras.map((row) => ({
          id: row.id,
          description: row.description,
          amount: String(row.amount).replace('.', ','),
          committed: true,
        }))
  return [...committed, blankExtra()]
}

function parsePositive(raw: string): number | null {
  const n = parseMoney(raw)
  if (n == null || n <= 0) return null
  return n
}

function draftInput(fields: {
  kind: ProductKind
  spanCm: string
  widthMm: string
  heightMm: string
  glassColor: string
  profileColor: string
  thicknessMm: string
  subtype: CorrerSubtype
  hasLatch: boolean
  finish: EspelhoFinish
  espelhoColor: string
  espelhoThickness: string
  markup: string
  extraRows: { id: string; description: string; amount: string }[]
  customDesc: string
  customAmount: string
  requireDescription: boolean
}): ItemInput | null {
  const markup = parseMoney(fields.markup)
  if (fields.kind !== 'custom' && markup == null) return null
  const mk = (markup ?? 0) / 100
  const extras = collectExtras(fields.extraRows)
  if (fields.requireDescription && extras == null) return null

  switch (fields.kind) {
    case 'box': {
      const spanCm = parsePositive(fields.spanCm)
      if (spanCm == null) return null
      return {
        kind: 'box',
        spanCm,
        glassColor: fields.glassColor,
        profileColor: fields.profileColor,
        markup: mk,
        extras: extras ?? [],
      }
    }
    case 'correr': {
      const widthMm = parsePositive(fields.widthMm)
      const heightMm = parsePositive(fields.heightMm)
      if (widthMm == null || heightMm == null) return null
      return {
        kind: 'correr',
        subtype: fields.subtype,
        widthMm,
        heightMm,
        glassColor: fields.glassColor,
        thicknessMm: fields.thicknessMm,
        profileColor: fields.profileColor,
        markup: mk,
        extras: extras ?? [],
      }
    }
    case 'pivotante': {
      const widthMm = parsePositive(fields.widthMm)
      const heightMm = parsePositive(fields.heightMm)
      if (widthMm == null || heightMm == null) return null
      return {
        kind: 'pivotante',
        widthMm,
        heightMm,
        glassColor: fields.glassColor,
        thicknessMm: fields.thicknessMm,
        profileColor: fields.profileColor,
        hasLatch: fields.hasLatch,
        markup: mk,
        extras: extras ?? [],
      }
    }
    case 'maxiar': {
      const widthMm = parsePositive(fields.widthMm)
      const heightMm = parsePositive(fields.heightMm)
      if (widthMm == null || heightMm == null) return null
      return {
        kind: 'maxiar',
        widthMm,
        heightMm,
        glassColor: fields.glassColor,
        thicknessMm: fields.thicknessMm,
        profileColor: fields.profileColor,
        markup: mk,
        extras: extras ?? [],
      }
    }
    case 'fixo': {
      const widthMm = parsePositive(fields.widthMm)
      const heightMm = parsePositive(fields.heightMm)
      if (widthMm == null || heightMm == null) return null
      return {
        kind: 'fixo',
        widthMm,
        heightMm,
        glassColor: fields.glassColor,
        thicknessMm: fields.thicknessMm,
        markup: mk,
        extras: extras ?? [],
      }
    }
    case 'espelho': {
      const widthMm = parsePositive(fields.widthMm)
      const heightMm = parsePositive(fields.heightMm)
      if (widthMm == null || heightMm == null || !fields.espelhoThickness) return null
      return {
        kind: 'espelho',
        finish: fields.finish,
        widthMm,
        heightMm,
        glassColor: fields.espelhoColor,
        thicknessMm: fields.espelhoThickness,
        markup: mk,
        extras: extras ?? [],
      }
    }
    case 'custom': {
      const amount = parseMoney(fields.customAmount)
      const description = fields.customDesc.trim()
      if (amount == null) return null
      if (fields.requireDescription && !description) return null
      return { kind: 'custom', description: description || 'Item avulso', amount }
    }
    default:
      return null
  }
}

function seedFromInput(
  catalog: Catalog,
  initial?: ItemInput,
): {
  kind: ProductKind
  spanCm: string
  widthMm: string
  heightMm: string
  glassColor: string
  profileColor: string
  thicknessMm: string
  subtype: CorrerSubtype
  hasLatch: boolean
  finish: EspelhoFinish
  espelhoColor: string
  espelhoThickness: string
  markup: string
  customDesc: string
  customAmount: string
} {
  const cfg = catalog.config
  const base = {
    kind: 'box' as ProductKind,
    spanCm: '140',
    widthMm: '1000',
    heightMm: '2000',
    glassColor: cfg.glassColors[0] ?? 'Incolor',
    profileColor: cfg.aluminumColors[0]?.color ?? 'Fosco',
    thicknessMm: cfg.temperedThicknessesMm[1] ?? '08',
    subtype: 'J2F' as CorrerSubtype,
    hasLatch: true,
    finish: 'Espelho Lapidado' as EspelhoFinish,
    espelhoColor: 'Prata',
    espelhoThickness: '04',
    markup: pctStr(cfg.defaultMarkup.box),
    customDesc: '',
    customAmount: '',
  }

  if (!initial) return base

  switch (initial.kind) {
    case 'box':
      return {
        ...base,
        kind: 'box',
        spanCm: String(initial.spanCm),
        glassColor: initial.glassColor,
        profileColor: initial.profileColor,
        markup: pctStr(initial.markup),
      }
    case 'correr':
      return {
        ...base,
        kind: 'correr',
        widthMm: String(initial.widthMm),
        heightMm: String(initial.heightMm),
        glassColor: initial.glassColor,
        thicknessMm: initial.thicknessMm,
        profileColor: initial.profileColor,
        subtype: initial.subtype,
        markup: pctStr(initial.markup),
      }
    case 'pivotante':
      return {
        ...base,
        kind: 'pivotante',
        widthMm: String(initial.widthMm),
        heightMm: String(initial.heightMm),
        glassColor: initial.glassColor,
        thicknessMm: initial.thicknessMm,
        profileColor: initial.profileColor,
        hasLatch: initial.hasLatch,
        markup: pctStr(initial.markup),
      }
    case 'maxiar':
      return {
        ...base,
        kind: 'maxiar',
        widthMm: String(initial.widthMm),
        heightMm: String(initial.heightMm),
        glassColor: initial.glassColor,
        thicknessMm: initial.thicknessMm,
        profileColor: initial.profileColor,
        markup: pctStr(initial.markup),
      }
    case 'fixo':
      return {
        ...base,
        kind: 'fixo',
        widthMm: String(initial.widthMm),
        heightMm: String(initial.heightMm),
        glassColor: initial.glassColor,
        thicknessMm: initial.thicknessMm,
        markup: pctStr(initial.markup),
      }
    case 'espelho':
      return {
        ...base,
        kind: 'espelho',
        widthMm: String(initial.widthMm),
        heightMm: String(initial.heightMm),
        finish: initial.finish,
        espelhoColor: initial.glassColor,
        espelhoThickness: initial.thicknessMm,
        markup: pctStr(initial.markup),
      }
    case 'custom':
      return {
        ...base,
        kind: 'custom',
        customDesc: initial.description,
        customAmount: String(initial.amount).replace('.', ','),
      }
  }
}

interface Props {
  catalog: Catalog
  onSubmit: (input: ItemInput) => void
  initial?: ItemInput
  onCancel?: () => void
  title?: string
  submitLabel?: string
  hideTitle?: boolean
  lockKind?: ProductKind
}

export function ItemForm({
  catalog,
  onSubmit,
  initial,
  onCancel,
  title = 'Adicionar item',
  submitLabel = 'Adicionar ao orçamento',
  hideTitle = false,
  lockKind,
}: Props) {
  const cfg = catalog.config
  const seeded = seedFromInput(catalog, initial)
  const startKind = lockKind ?? seeded.kind

  const [kind, setKind] = useState<ProductKind>(startKind)
  const [spanCm, setSpanCm] = useState(seeded.spanCm)
  const [widthMm, setWidthMm] = useState(seeded.widthMm)
  const [heightMm, setHeightMm] = useState(seeded.heightMm)
  const [glassColor, setGlassColor] = useState(seeded.glassColor)
  const [profileColor, setProfileColor] = useState(seeded.profileColor)
  const [thicknessMm, setThicknessMm] = useState(seeded.thicknessMm)
  const [subtype, setSubtype] = useState<CorrerSubtype>(seeded.subtype)
  const [hasLatch, setHasLatch] = useState(seeded.hasLatch)
  const [finish, setFinish] = useState<EspelhoFinish>(seeded.finish)
  const [espelhoColor, setEspelhoColor] = useState(seeded.espelhoColor)
  const [espelhoThickness, setEspelhoThickness] = useState(seeded.espelhoThickness)
  const [markup, setMarkup] = useState(
    !initial && lockKind && lockKind !== 'custom'
      ? pctStr(cfg.defaultMarkup[lockKind])
      : seeded.markup,
  )
  const [extraRows, setExtraRows] = useState(seedExtraRows(initial))
  const [customDesc, setCustomDesc] = useState(seeded.customDesc)
  const [customAmount, setCustomAmount] = useState(seeded.customAmount)
  const [formError, setFormError] = useState<string | null>(null)
  const [numSnap, setNumSnap] = useState({
    spanCm,
    widthMm,
    heightMm,
    markup,
    extraRows,
    customDesc,
    customAmount,
  })
  const previewCache = useRef<{ kind: ProductKind; result: PricingResult } | null>(null)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setNumSnap({ spanCm, widthMm, heightMm, markup, extraRows, customDesc, customAmount })
    }, 300)
    return () => window.clearTimeout(id)
  }, [spanCm, widthMm, heightMm, markup, extraRows, customDesc, customAmount])

  const espelhoColors = useMemo(() => {
    const set = new Set(
      catalog.vidros
        .filter((v) => isCatalogItemActive(v) && v.tipo === finish && v.valorM2 != null)
        .map((v) => v.cor),
    )
    return [...set]
  }, [catalog.vidros, finish])

  const espelhoThicknesses = useMemo(() => {
    const set = new Set(
      catalog.vidros
        .filter(
          (v) =>
            isCatalogItemActive(v) &&
            v.tipo === finish &&
            v.cor === espelhoColor &&
            v.valorM2 != null &&
            v.espessuraMm,
        )
        .map((v) => v.espessuraMm as string),
    )
    return [...set]
  }, [catalog.vidros, finish, espelhoColor])

  const preview = useMemo(() => {
    const input = draftInput({
      kind,
      spanCm: numSnap.spanCm,
      widthMm: numSnap.widthMm,
      heightMm: numSnap.heightMm,
      glassColor,
      profileColor,
      thicknessMm,
      subtype,
      hasLatch,
      finish,
      espelhoColor,
      espelhoThickness,
      markup: numSnap.markup,
      extraRows: numSnap.extraRows,
      customDesc: numSnap.customDesc,
      customAmount: numSnap.customAmount,
      requireDescription: false,
    })
    if (!input) {
      return previewCache.current?.kind === kind ? previewCache.current.result : null
    }
    try {
      const result = priceItem(catalog, input)
      previewCache.current = { kind, result }
      return result
    } catch {
      return previewCache.current?.kind === kind ? previewCache.current.result : null
    }
  }, [
    catalog,
    kind,
    numSnap,
    glassColor,
    profileColor,
    thicknessMm,
    subtype,
    hasLatch,
    finish,
    espelhoColor,
    espelhoThickness,
  ])

  const onKindChange = (k: ProductKind) => {
    setKind(k)
    if (k !== 'custom') {
      setMarkup(pctStr(cfg.defaultMarkup[k as keyof PricingConfig['defaultMarkup']]))
    }
    setFormError(null)
  }

  const addExtra = () => {
    const draft = extraRows.find((row) => !row.committed)
    if (!draft) {
      setExtraRows((rows) => [...rows, blankExtra()])
      return
    }
    const description = draft.description.trim()
    const amountRaw = draft.amount.trim()
    if (!description && !amountRaw) return
    if (!description || parseMoney(amountRaw) == null) {
      setFormError('Cada adicional precisa de descrição e valor.')
      return
    }
    setFormError(null)
    setExtraRows((rows) => [
      ...rows.map((row) =>
        row.id === draft.id ? { ...row, description, amount: amountRaw, committed: true } : row,
      ),
      blankExtra(),
    ])
  }

  const submit = () => {
    if (kind === 'custom' && !customDesc.trim()) {
      setFormError('Descreva o item avulso')
      return
    }
    const input = draftInput({
      kind,
      spanCm,
      widthMm,
      heightMm,
      glassColor,
      profileColor,
      thicknessMm,
      subtype,
      hasLatch,
      finish,
      espelhoColor,
      espelhoThickness,
      markup,
      extraRows,
      customDesc,
      customAmount,
      requireDescription: true,
    })
    if (!input) {
      setFormError(
        kind === 'custom'
          ? 'Valor inválido'
          : collectExtras(extraRows) == null
            ? 'Cada adicional precisa de descrição e valor.'
            : 'Medidas ou valores inválidos',
      )
      return
    }
    onSubmit(input)
    setFormError(null)
  }

  return (
    <div className="item-form">
      {!hideTitle && <h3>{title}</h3>}
      {!lockKind && (
      <div className="kind-grid">
        {ITEM_KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            className={kind === k.id ? 'chip active' : 'chip'}
            onClick={() => onKindChange(k.id)}
          >
            {k.label}
          </button>
        ))}
      </div>
      )}

      <div className="item-form__fields">
      {kind === 'custom' ? (
        <div className="grid">
          <label className="full">
            Descrição
            <input
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              placeholder="Ex.: Aplicação de película"
            />
          </label>
          <label>
            Valor (R$)
            <input
              className="money-input"
              inputMode="decimal"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
            />
          </label>
        </div>
      ) : (
        <div className="grid">
          {kind === 'box' && (
            <label>
              Vão (cm)
              <input
                inputMode="decimal"
                value={spanCm}
                onChange={(e) => setSpanCm(e.target.value)}
              />
            </label>
          )}

          {kind !== 'box' && (
            <>
              <label>
                Largura (mm)
                <input
                  inputMode="numeric"
                  value={widthMm}
                  onChange={(e) => setWidthMm(e.target.value)}
                />
              </label>
              <label>
                Altura (mm)
                <input
                  inputMode="numeric"
                  value={heightMm}
                  onChange={(e) => setHeightMm(e.target.value)}
                />
              </label>
            </>
          )}

          {kind === 'correr' && (
            <label>
              Tipo
              <select
                value={subtype}
                onChange={(e) => setSubtype(e.target.value as CorrerSubtype)}
              >
                <option value="J2F">Janela 2 folhas (J2F)</option>
                <option value="J4F">Janela 4 folhas (J4F)</option>
                <option value="P2F">Porta 2 folhas (P2F)</option>
                <option value="P4F">Porta 4 folhas (P4F)</option>
              </select>
            </label>
          )}

          {kind === 'espelho' ? (
            <>
              <label>
                Acabamento
                <select
                  value={finish}
                  onChange={(e) => {
                    setFinish(e.target.value as EspelhoFinish)
                  }}
                >
                  <option value="Espelho Lapidado">Lapidado</option>
                  <option value="Espelho Bisotado">Bisotado</option>
                </select>
              </label>
              <label>
                Cor
                <select
                  value={espelhoColor}
                  onChange={(e) => setEspelhoColor(e.target.value)}
                >
                  {espelhoColors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Espessura
                <select
                  value={espelhoThickness}
                  onChange={(e) => setEspelhoThickness(e.target.value)}
                >
                  {espelhoThicknesses.map((t) => (
                    <option key={t} value={t}>
                      {t} mm
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              {kind !== 'box' && (
                <label>
                  Espessura
                  <select
                    value={thicknessMm}
                    onChange={(e) => setThicknessMm(e.target.value)}
                  >
                    {cfg.temperedThicknessesMm.map((t) => (
                      <option key={t} value={t}>
                        {t} mm
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Cor do vidro
                <select
                  value={glassColor}
                  onChange={(e) => setGlassColor(e.target.value)}
                >
                  {cfg.glassColors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {(kind === 'box' ||
            kind === 'correr' ||
            kind === 'pivotante' ||
            kind === 'maxiar') && (
            <label>
              Cor do perfil
              <select
                value={profileColor}
                onChange={(e) => setProfileColor(e.target.value)}
              >
                {cfg.aluminumColors.map((c) => (
                  <option key={c.color} value={c.color}>
                    {c.color}
                    {c.surcharge ? ` (+${c.surcharge * 100}%)` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          {kind === 'pivotante' && (
            <label className="check-field">
              Incluir trinco
              <span className="check-field__box">
                <input
                  type="checkbox"
                  checked={hasLatch}
                  onChange={(e) => setHasLatch(e.target.checked)}
                />
                <span>{hasLatch ? 'Sim' : 'Não'}</span>
              </span>
            </label>
          )}

          <label>
            Margem (%)
            <input
              className="money-input"
              inputMode="decimal"
              value={markup}
              onChange={(e) => setMarkup(e.target.value)}
            />
          </label>
          <div className="full extra-list">
            <span className="extra-list__label">Adicionais do item</span>
            {extraRows.map((row) => (
              <div className="inline-form" key={row.id}>
                <input
                  placeholder="Ex.: Película"
                  value={row.description}
                  onChange={(e) =>
                    setExtraRows((rows) =>
                      rows.map((r) =>
                        r.id === row.id ? { ...r, description: e.target.value } : r,
                      ),
                    )
                  }
                  onKeyDown={(e) => {
                    if (row.committed || e.key !== 'Enter') return
                    e.preventDefault()
                    addExtra()
                  }}
                />
                <input
                  className="money-input"
                  placeholder="0,00"
                  inputMode="decimal"
                  aria-label="Valor do adicional"
                  value={row.amount}
                  onChange={(e) =>
                    setExtraRows((rows) =>
                      rows.map((r) => (r.id === row.id ? { ...r, amount: e.target.value } : r)),
                    )
                  }
                  onKeyDown={(e) => {
                    if (row.committed || e.key !== 'Enter') return
                    e.preventDefault()
                    addExtra()
                  }}
                />
                {row.committed ? (
                  <button
                    type="button"
                    className="btn btn--remove"
                    aria-label="Excluir adicional"
                    onClick={() =>
                      setExtraRows((rows) => rows.filter((r) => r.id !== row.id))
                    }
                  >
                    <CrossIcon />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn"
                    aria-label="Incluir adicional"
                    onClick={addExtra}
                  >
                    <PlusIcon />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {formError && <p className="banner error">{formError}</p>}
      </div>

      {preview && (
        <div className="item-cost">
          <div className="item-cost__head">
            <span>Valor do item</span>
            <strong>{formatBrl(preview.breakdown.finalPrice)}</strong>
          </div>
          <ul className="breakdown">
            <li>
              <span>Mão de obra</span>
              <span>{formatBrl(preview.breakdown.labor)}</span>
            </li>
            <li>
              <span>Vidros</span>
              <span>{formatBrl(preview.breakdown.glass)}</span>
            </li>
            <li>
              <span>Alumínios</span>
              <span>{formatBrl(preview.breakdown.aluminum)}</span>
            </li>
            <li>
              <span>Ferragens</span>
              <span>{formatBrl(preview.breakdown.hardware)}</span>
            </li>
            <li>
              <span>Acessórios</span>
              <span>{formatBrl(preview.breakdown.accessories)}</span>
            </li>
            {(collectExtras(numSnap.extraRows) ?? []).length === 0 ? (
              <li>
                <span>Adicionais do item</span>
                <span>{formatBrl(0)}</span>
              </li>
            ) : (
              (collectExtras(numSnap.extraRows) ?? []).map((row) => (
                <li key={row.id} className="breakdown__extra">
                  <span>{row.description}</span>
                  <span>{formatBrl(row.amount)}</span>
                </li>
              ))
            )}
            <li className="breakdown__cost">
              <span>Custo</span>
              <span>{formatBrl(preview.breakdown.totalCost)}</span>
            </li>
            <li className="breakdown__margin">
              <span>Margem ({(preview.breakdown.markup * 100).toFixed(0)}%)</span>
              <span>{formatBrl(preview.breakdown.marginAmount)}</span>
            </li>
          </ul>
        </div>
      )}

      <div className="item-form__actions">
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="button" className="btn primary" onClick={submit}>
          {submitLabel}
        </button>
      </div>
    </div>
  )
}

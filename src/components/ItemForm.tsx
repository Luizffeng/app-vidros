import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ItemFormState } from '../data/itemDraft'
import { isCatalogItemActive } from '../domain/catalogActive'
import { marginLabel } from '../domain/itemDescription'
import { priceItem } from '../domain/pricing'
import { formatBrl } from '../domain/quote'
import type {
  Catalog,
  CorrerSubtype,
  EspelhoFinish,
  ItemExtra,
  ItemInput,
  MarginMode,
  PricingConfig,
  PricingResult,
  ProductKind,
} from '../domain/types'
import { Banner } from './Banner'
import { DropdownField, type DropdownOption } from './Dropdown'

const CORRER_SUBTYPES: DropdownOption<CorrerSubtype>[] = [
  { value: 'J2F', label: 'Janela 2 folhas (J2F)' },
  { value: 'J4F', label: 'Janela 4 folhas (J4F)' },
  { value: 'P2F', label: 'Porta 2 folhas (P2F)' },
  { value: 'P4F', label: 'Porta 4 folhas (P4F)' },
]

const ESPELHO_FINISHES: DropdownOption<EspelhoFinish>[] = [
  { value: 'Espelho Lapidado', label: 'Lapidado' },
  { value: 'Espelho Bisotado', label: 'Bisotado' },
]

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

function restoreExtraRows(rows: ItemFormState['extraRows']): ExtraDraft[] {
  const restored = rows.map((row) => ({ ...row, id: crypto.randomUUID() }))
  return restored.some((row) => !row.committed) ? restored : [...restored, blankExtra()]
}

/** Empty extra rows and surrounding spaces do not count as typing. */
function sameFormState(a: ItemFormState, b: ItemFormState): boolean {
  const norm = (s: ItemFormState) => {
    const fields: Record<string, unknown> = {
      ...s,
      note: s.note.trim(),
      customDesc: s.customDesc.trim(),
      extraRows: s.extraRows
        .filter((r) => r.description.trim() || r.amount.trim())
        .map((r) => [r.description.trim(), r.amount.trim(), r.committed]),
    }
    return JSON.stringify(Object.keys(fields).sort().map((key) => [key, fields[key]]))
  }
  return norm(a) === norm(b)
}

function parsePositive(raw: string): number | null {
  const n = parseMoney(raw)
  if (n == null || n <= 0) return null
  return n
}

/** The form has no labor field; an edit keeps the item's own rate. */
function keepLaborRate(input: ItemInput, initial?: ItemInput): ItemInput {
  if (input.kind === 'custom' || !initial || initial.kind === 'custom' || initial.kind !== input.kind) return input
  return initial.laborRate == null ? input : { ...input, laborRate: initial.laborRate }
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
  marginMode: MarginMode
  onSubmit: (input: ItemInput) => void
  initial?: ItemInput
  /** Unfinished input to restore (item draft); wins over `initial`. */
  initialState?: ItemFormState
  /** Raw fields on every change; `dirty` = differs from the form as first opened without a draft. */
  onStateChange?: (state: ItemFormState, dirty: boolean) => void
  onCancel?: () => void
  title?: string
  submitLabel?: string
  hideTitle?: boolean
  lockKind?: ProductKind
}

export function ItemForm({
  catalog,
  marginMode,
  onSubmit,
  initial,
  initialState,
  onStateChange,
  onCancel,
  title = 'Adicionar item',
  submitLabel = 'Adicionar ao orçamento',
  hideTitle = false,
  lockKind,
}: Props) {
  const cfg = catalog.config
  const [pristine] = useState((): ItemFormState => {
    const seeded = seedFromInput(catalog, initial)
    return {
      ...seeded,
      kind: lockKind ?? seeded.kind,
      markup:
        !initial && lockKind && lockKind !== 'custom' ? pctStr(cfg.defaultMarkup[lockKind]) : seeded.markup,
      extraRows: seedExtraRows(initial).map(({ description, amount, committed }) => ({
        description,
        amount,
        committed,
      })),
      note: initial?.note ?? '',
    }
  })
  const start = initialState ?? pristine

  const [kind, setKind] = useState<ProductKind>(start.kind)
  const [spanCm, setSpanCm] = useState(start.spanCm)
  const [widthMm, setWidthMm] = useState(start.widthMm)
  const [heightMm, setHeightMm] = useState(start.heightMm)
  const [glassColor, setGlassColor] = useState(start.glassColor)
  const [profileColor, setProfileColor] = useState(start.profileColor)
  const [thicknessMm, setThicknessMm] = useState(start.thicknessMm)
  const [subtype, setSubtype] = useState<CorrerSubtype>(start.subtype)
  const [hasLatch, setHasLatch] = useState(start.hasLatch)
  const [finish, setFinish] = useState<EspelhoFinish>(start.finish)
  const [espelhoColor, setEspelhoColor] = useState(start.espelhoColor)
  const [espelhoThickness, setEspelhoThickness] = useState(start.espelhoThickness)
  const [markup, setMarkup] = useState(start.markup)
  const [extraRows, setExtraRows] = useState<ExtraDraft[]>(() =>
    initialState ? restoreExtraRows(initialState.extraRows) : seedExtraRows(initial),
  )
  const [customDesc, setCustomDesc] = useState(start.customDesc)
  const [customAmount, setCustomAmount] = useState(start.customAmount)
  const [note, setNote] = useState(start.note)

  const formState: ItemFormState = {
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
    extraRows: extraRows.map(({ description, amount, committed }) => ({ description, amount, committed })),
    customDesc,
    customAmount,
    note,
  }
  const stateKey = JSON.stringify(formState)
  const onStateChangeRef = useRef(onStateChange)
  useEffect(() => {
    onStateChangeRef.current = onStateChange
  })
  useEffect(() => {
    const state = JSON.parse(stateKey) as ItemFormState
    onStateChangeRef.current?.(state, !sameFormState(state, pristine))
  }, [stateKey, pristine])
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
      const result = priceItem(catalog, keepLaborRate(input, initial), marginMode)
      previewCache.current = { kind, result }
      return result
    } catch {
      return previewCache.current?.kind === kind ? previewCache.current.result : null
    }
  }, [
    catalog,
    initial,
    marginMode,
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
    const trimmedNote = note.trim()
    const kept = keepLaborRate(input, initial)
    onSubmit(trimmedNote ? { ...kept, note: trimmedNote } : kept)
    setFormError(null)
  }

  const glassColorField = (
    <DropdownField
      label="Cor do vidro"
      value={glassColor}
      options={cfg.glassColors.map((c) => ({ value: c, label: c }))}
      onChange={setGlassColor}
    />
  )
  const markupInput = (
    <input
      className="money-input"
      inputMode="decimal"
      value={markup}
      onChange={(e) => setMarkup(e.target.value)}
    />
  )
  const withMargin = (field: ReactNode) =>
    marginMode === 'autonomo' ? (
      <div className="full">{field}</div>
    ) : (
      <div className="field-pair field-pair--trail full">
        {field}
        <label>
          Margem (%)
          {markupInput}
        </label>
      </div>
    )

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
        <div className="field-pair field-pair--trail">
          <label>
            Descrição
            <input
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              placeholder="Ex.: Película"
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
            <div className="field-pair field-pair--number full">
              <label>
                Vão (cm)
                <input
                  inputMode="decimal"
                  value={spanCm}
                  onChange={(e) => setSpanCm(e.target.value)}
                />
              </label>
              {glassColorField}
            </div>
          )}

          {kind !== 'box' && (
            <div className="field-pair field-pair--half full">
              <label>
                Largura (mm)
                <input
                  inputMode="numeric"
                  data-select-all
                  value={widthMm}
                  onChange={(e) => setWidthMm(e.target.value)}
                />
              </label>
              <label>
                Altura (mm)
                <input
                  inputMode="numeric"
                  data-select-all
                  value={heightMm}
                  onChange={(e) => setHeightMm(e.target.value)}
                />
              </label>
            </div>
          )}

          {kind === 'correr' && (
            <DropdownField
              className="full"
              label="Tipo"
              value={subtype}
              options={CORRER_SUBTYPES}
              onChange={setSubtype}
            />
          )}

          {kind === 'espelho' ? (
            <>
              {withMargin(
                <DropdownField
                  label="Acabamento"
                  value={finish}
                  options={ESPELHO_FINISHES}
                  onChange={setFinish}
                />,
              )}
              <div className="field-pair field-pair--half full">
                <DropdownField
                  label="Cor"
                  value={espelhoColor}
                  options={espelhoColors.map((c) => ({ value: c, label: c }))}
                  onChange={setEspelhoColor}
                />
                <DropdownField
                  label="Espessura"
                  value={espelhoThickness}
                  options={espelhoThicknesses.map((t) => ({ value: t, label: `${t} mm` }))}
                  onChange={setEspelhoThickness}
                />
              </div>
            </>
          ) : (
            kind !== 'box' && (
              <div className="field-pair field-pair--half full">
                {glassColorField}
                <DropdownField
                  label="Espessura"
                  value={thicknessMm}
                  options={cfg.temperedThicknessesMm.map((t) => ({ value: t, label: `${t} mm` }))}
                  onChange={setThicknessMm}
                />
              </div>
            )
          )}

          {(kind === 'box' || kind === 'correr' || kind === 'pivotante' || kind === 'maxiar') &&
            withMargin(
              <DropdownField
                label="Cor do perfil"
                value={profileColor}
                options={cfg.aluminumColors.map((c) => ({
                  value: c.color,
                  label: c.surcharge ? `${c.color} (+${c.surcharge * 100}%)` : c.color,
                }))}
                onChange={setProfileColor}
              />,
            )}

          {kind === 'fixo' && marginMode !== 'autonomo' && (
            <label className="inline-field full">
              Margem (%)
              {markupInput}
            </label>
          )}

          {kind === 'pivotante' && (
            <label className="check-field__box check-field__box--row full">
              <span>Incluir trinco</span>
              <input
                type="checkbox"
                checked={hasLatch}
                onChange={(e) => setHasLatch(e.target.checked)}
              />
            </label>
          )}
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

      <label className="item-form__note">
        Observação (sai no PDF e no WhatsApp)
        <input
          value={note}
          maxLength={120}
          placeholder="Ex.: Banheiro, quarto, 2º andar"
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      {formError && <Banner tone="error">{formError}</Banner>}
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
            {marginMode !== 'autonomo' && (
              <li className="breakdown__margin">
                <span>{marginLabel(preview.breakdown)}</span>
                <span>{formatBrl(preview.breakdown.marginAmount)}</span>
              </li>
            )}
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

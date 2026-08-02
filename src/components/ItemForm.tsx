import { useMemo, useState } from 'react'
import { isCatalogItemActive } from '../domain/catalogActive'
import type {
  Catalog,
  CorrerSubtype,
  EspelhoFinish,
  ItemInput,
  PricingConfig,
  ProductKind,
} from '../domain/types'

const KINDS: { id: ProductKind; label: string }[] = [
  { id: 'box', label: 'Box' },
  { id: 'correr', label: 'Correr' },
  { id: 'pivotante', label: 'Pivotante' },
  { id: 'maxiar', label: 'Maxim-ar' },
  { id: 'fixo', label: 'Vidro fixo' },
  { id: 'espelho', label: 'Espelho' },
  { id: 'custom', label: 'Avulso / texto' },
]

function pctStr(fraction: number): string {
  return (fraction * 100).toFixed(2).replace('.', ',')
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
  extras: string
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
    extras: '0',
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
        extras: String(initial.extras),
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
        extras: String(initial.extras),
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
        extras: String(initial.extras),
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
        extras: String(initial.extras),
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
        extras: String(initial.extras),
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
        extras: String(initial.extras),
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
}

export function ItemForm({
  catalog,
  onSubmit,
  initial,
  onCancel,
  title = 'Adicionar item',
  submitLabel = 'Adicionar ao orçamento',
}: Props) {
  const cfg = catalog.config
  const seeded = seedFromInput(catalog, initial)

  const [kind, setKind] = useState<ProductKind>(seeded.kind)
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
  const [markup, setMarkup] = useState(seeded.markup)
  const [extras, setExtras] = useState(seeded.extras)
  const [customDesc, setCustomDesc] = useState(seeded.customDesc)
  const [customAmount, setCustomAmount] = useState(seeded.customAmount)
  const [formError, setFormError] = useState<string | null>(null)

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

  const onKindChange = (k: ProductKind) => {
    setKind(k)
    if (k !== 'custom') {
      setMarkup(pctStr(cfg.defaultMarkup[k as keyof PricingConfig['defaultMarkup']]))
    }
    setFormError(null)
  }

  const submit = () => {
    try {
      const mk = Number(markup.replace(',', '.')) / 100
      const ex = Number(extras.replace(',', '.')) || 0
      let input: ItemInput

      switch (kind) {
        case 'box':
          input = {
            kind: 'box',
            spanCm: Number(spanCm.replace(',', '.')),
            glassColor,
            profileColor,
            markup: mk,
            extras: ex,
          }
          break
        case 'correr':
          input = {
            kind: 'correr',
            subtype,
            widthMm: Number(widthMm),
            heightMm: Number(heightMm),
            glassColor,
            thicknessMm,
            profileColor,
            markup: mk,
            extras: ex,
          }
          break
        case 'pivotante':
          input = {
            kind: 'pivotante',
            widthMm: Number(widthMm),
            heightMm: Number(heightMm),
            glassColor,
            thicknessMm,
            profileColor,
            hasLatch,
            markup: mk,
            extras: ex,
          }
          break
        case 'maxiar':
          input = {
            kind: 'maxiar',
            widthMm: Number(widthMm),
            heightMm: Number(heightMm),
            glassColor,
            thicknessMm,
            profileColor,
            markup: mk,
            extras: ex,
          }
          break
        case 'fixo':
          input = {
            kind: 'fixo',
            widthMm: Number(widthMm),
            heightMm: Number(heightMm),
            glassColor,
            thicknessMm,
            markup: mk,
            extras: ex,
          }
          break
        case 'espelho':
          input = {
            kind: 'espelho',
            finish,
            widthMm: Number(widthMm),
            heightMm: Number(heightMm),
            glassColor: espelhoColor,
            thicknessMm: espelhoThickness,
            markup: mk,
            extras: ex,
          }
          break
        case 'custom':
          input = {
            kind: 'custom',
            description: customDesc.trim(),
            amount: Number(customAmount.replace(',', '.')),
          }
          if (!input.description) throw new Error('Descreva o item avulso')
          if (Number.isNaN(input.amount)) throw new Error('Valor inválido')
          break
        default:
          throw new Error('Tipo inválido')
      }

      onSubmit(input)
      setFormError(null)
      if (!initial) {
        setExtras('0')
        setCustomDesc('')
        setCustomAmount('')
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="item-form">
      <h3>{title}</h3>
      <div className="kind-grid">
        {KINDS.map((k) => (
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
            <label className="check">
              <input
                type="checkbox"
                checked={hasLatch}
                onChange={(e) => setHasLatch(e.target.checked)}
              />
              Incluir trinco
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
          <label>
            Adicionais do item (R$)
            <input
              className="money-input"
              inputMode="decimal"
              value={extras}
              onChange={(e) => setExtras(e.target.value)}
            />
          </label>
        </div>
      )}

      {formError && <p className="banner error">{formError}</p>}

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

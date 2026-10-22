import { useState } from 'react'
import { sameFinalMeasures, seedFinalMeasures } from '../domain/finalMeasures'
import type { FinalMeasure, QuoteItem } from '../domain/types'
import { Modal } from './Modal'

export function FinalMeasuresForm({
  item,
  kindLabel,
  onClose,
  onSave,
}: {
  item: QuoteItem
  kindLabel: string
  onClose: () => void
  onSave: (measures: FinalMeasure[]) => void
}) {
  const initial = item.finalMeasures ?? seedFinalMeasures(item.input)
  const [rows, setRows] = useState<FinalMeasure[]>(() => initial.map((r) => ({ ...r })))
  const unchanged = sameFinalMeasures(rows, initial)

  return (
    <Modal title={`Medidas finais: ${kindLabel}`} onClose={onClose}>
      <p className="muted tip-help">Usadas só na loja. Não saem no PDF nem no WhatsApp.</p>
      <div className="grid">
        {rows.map((row, index) => (
          <label key={row.key} className={row.unit ? 'inline-field' : undefined}>
            {row.label}
            {row.unit ? ` (${row.unit})` : ''}
            <input
              inputMode="decimal"
              data-select-all
              value={row.value}
              onChange={(e) => {
                const value = e.target.value
                setRows((prev) => prev.map((r, i) => (i === index ? { ...r, value } : r)))
              }}
            />
          </label>
        ))}
      </div>
      <div className="item-form__actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={unchanged}
          onClick={() => onSave(rows.map((r) => ({ ...r, value: r.value.trim() })))}
        >
          Salvar
        </button>
      </div>
    </Modal>
  )
}

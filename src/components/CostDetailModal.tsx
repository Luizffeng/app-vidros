import { useState } from 'react'
import { aluminioValorMetro } from '../domain/catalogEdit'
import { parseMoneyBr } from '../domain/brazil'
import { composeCost, type CostLine } from '../domain/costComposition'
import { describeItem, marginLabel } from '../domain/itemDescription'
import { formatBrl } from '../domain/quote'
import type { Catalog, CatalogRef, Quote, QuoteItem } from '../domain/types'
import { Modal } from './Modal'

const UNIT_LABEL = { m2: 'm²', m: 'm', un: 'un' } as const

function formatQty(quantity: number, unit?: CostLine['unit']): string {
  const digits = unit === 'un' && Number.isInteger(quantity) ? 0 : 3
  const n = quantity.toLocaleString('pt-BR', { maximumFractionDigits: digits })
  return unit ? `${n} ${UNIT_LABEL[unit]}` : n
}

function priceInput(value: number | undefined): string {
  return value == null ? '' : value.toFixed(2).replace('.', ',')
}

export function CostDetailModal({
  item,
  quote,
  catalog,
  isAdmin,
  onClose,
  onSetOverride,
  onUpdateCatalog,
}: {
  item: QuoteItem
  quote: Quote
  catalog: Catalog
  isAdmin: boolean
  onClose: () => void
  onSetOverride: (ref: CatalogRef, price: number | null) => Promise<void>
  onUpdateCatalog: (ref: CatalogRef, price: number) => Promise<void>
}) {
  const { groups } = composeCost(item, quote, catalog, { isAdmin })
  const desc = describeItem(item.input)
  const b = item.result.breakdown
  const canEdit = isAdmin && quote.status === 'draft'
  const [editing, setEditing] = useState<{ key: string; raw: string } | null>(null)
  const [confirmCatalog, setConfirmCatalog] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const run = async (action: () => Promise<void>, ok: string) => {
    setBusy(true)
    setNotice(null)
    try {
      await action()
      setEditing(null)
      setConfirmCatalog(false)
      setNotice({ ok: true, text: ok })
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Detalhes do custo" className="modal--cost" onClose={onClose}>
      <p className="cost-item">
        <strong>{desc.title}</strong>
        {desc.spec && <span>{desc.spec}</span>}
        {desc.size && <span>{desc.size}</span>}
      </p>

      {notice && (
        <div className={`banner ${notice.ok ? 'ok' : 'error'} cost-notice`} role="status">
          {notice.text}
        </div>
      )}

      <ul className="breakdown cost-summary">
        <li>
          <span>Mão de obra</span>
          <span>{formatBrl(b.labor)}</span>
        </li>
        <li>
          <span>Vidros</span>
          <span>{formatBrl(b.glass)}</span>
        </li>
        <li>
          <span>Alumínios</span>
          <span>{formatBrl(b.aluminum)}</span>
        </li>
        <li>
          <span>Ferragens</span>
          <span>{formatBrl(b.hardware)}</span>
        </li>
        <li>
          <span>Acessórios</span>
          <span>{formatBrl(b.accessories)}</span>
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
            <span>{formatBrl(b.extras)}</span>
          </li>
        )}
        <li className="breakdown__cost">
          <span>Custo</span>
          <span>{formatBrl(b.totalCost)}</span>
        </li>
        {(b.marginMode ?? 'empresa') !== 'autonomo' && (
          <li className="breakdown__margin">
            <span>{marginLabel(b)}</span>
            <span>{formatBrl(b.marginAmount)}</span>
          </li>
        )}
        <li className="breakdown__cost">
          <span>Preço</span>
          <span>{formatBrl(b.finalPrice)}</span>
        </li>
      </ul>

      {groups.map((group) => (
        <section key={group.category} className="cost-group" aria-label={group.label}>
          <h4 className="cost-group__head">
            <span>{group.label}</span>
            <span>{formatBrl(group.total)}</span>
          </h4>
          <ul className="cost-lines">
            {group.lines.map((line, i) => {
              const key = `${group.category}-${i}`
              const isEditing = editing?.key === key
              const value = isEditing ? parseMoneyBr(editing.raw) : null
              const perMeter =
                line.barLength && value != null ? aluminioValorMetro(value, line.barLength) : null
              return (
                <li key={key} className="cost-line">
                  <div className="cost-line__main">
                    <span className="cost-line__desc">{line.description}</span>
                    <span className="cost-line__total">{formatBrl(line.total)}</span>
                  </div>
                  <div className="cost-line__calc">
                    {line.code && <span className="cost-line__code">{line.code}</span>}
                    <span>
                      {formatQty(line.quantity, line.unit)} ×{' '}
                      {line.editable && !isEditing ? (
                        <button
                          type="button"
                          className="cost-line__price"
                          disabled={busy}
                          onClick={() => {
                            setNotice(null)
                            setConfirmCatalog(false)
                            setEditing({ key, raw: priceInput(line.editPrice) })
                          }}
                        >
                          {formatBrl(line.unitPrice)}
                        </button>
                      ) : (
                        formatBrl(line.unitPrice)
                      )}
                    </span>
                    {line.surcharge ? (
                      <span className="cost-line__tag">+{Math.round(line.surcharge * 100)}% cor</span>
                    ) : null}
                    {line.overridden && <span className="cost-line__tag cost-line__tag--own">preço deste orçamento</span>}
                  </div>

                  {canEdit && line.blockedReason === 'old-item' && (
                    <p className="cost-line__hint">Recalcule o item para editar.</p>
                  )}
                  {canEdit && line.blockedReason === 'inactive' && (
                    <p className="cost-line__hint">Código desativado no catálogo.</p>
                  )}
                  {canEdit && line.overridden && line.source && !isEditing && (
                    <button
                      type="button"
                      className="cost-line__link"
                      disabled={busy}
                      onClick={() =>
                        void run(() => onSetOverride(line.source!, null), 'Preço do catálogo restaurado.')
                      }
                    >
                      Voltar ao preço do catálogo
                    </button>
                  )}

                  {isEditing && line.source && (
                    <div className="cost-edit">
                      <label className="inline-field">
                        {line.barLength ? `R$ por barra (${line.barLength} m)` : `R$ por ${UNIT_LABEL[line.unit ?? 'un']}`}
                        <input
                          className="money-input cost-edit__input"
                          inputMode="decimal"
                          data-select-all
                          autoFocus
                          value={editing.raw}
                          aria-invalid={value == null}
                          onChange={(e) => setEditing({ key, raw: e.target.value })}
                        />
                      </label>
                      {line.surcharge ? (
                        <p className="cost-line__hint">Sem o acréscimo de cor (+{Math.round(line.surcharge * 100)}%).</p>
                      ) : null}
                      {perMeter != null && <p className="cost-line__hint">{formatBrl(perMeter)}/m</p>}
                      <div className="cost-edit__actions">
                        <button
                          type="button"
                          className="btn primary"
                          disabled={busy || value == null}
                          onClick={() =>
                            void run(() => onSetOverride(line.source!, value), 'Preço salvo só neste orçamento.')
                          }
                        >
                          Só neste orçamento
                        </button>
                        <button
                          type="button"
                          className="btn"
                          disabled={busy || value == null}
                          onClick={() => setConfirmCatalog(true)}
                        >
                          Atualizar no catálogo
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          disabled={busy}
                          onClick={() => {
                            setEditing(null)
                            setConfirmCatalog(false)
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                      {confirmCatalog && value != null && (
                        <div className="remove-pop cost-confirm" role="alertdialog" aria-label="Confirmar preço no catálogo">
                          <span>
                            Novos orçamentos usam o preço novo. Outros rascunhos mostram um aviso para
                            atualizar. Emitidos não mudam.
                          </span>
                          <span className="save-pop__actions">
                            <button
                              type="button"
                              className="btn remove-pop__yes"
                              disabled={busy}
                              onClick={() =>
                                void run(() => onUpdateCatalog(line.source!, value), 'Catálogo atualizado.')
                              }
                            >
                              Sim
                            </button>
                            <button type="button" className="btn" onClick={() => setConfirmCatalog(false)}>
                              Não
                            </button>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </Modal>
  )
}

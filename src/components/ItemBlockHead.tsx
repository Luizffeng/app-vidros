import { describeFormDraft, describeItem } from '../domain/itemDescription'
import { formatBrl } from '../domain/quote'
import type { QuoteItem } from '../domain/types'
import type { ItemFormState } from '../data/itemDraft'

export function ItemBlockHead({ item, onOpen }: { item: QuoteItem; onOpen?: () => void }) {
  const { title, spec, size } = describeItem(item.input)
  const body = (
    <>
      <ItemText title={title} spec={spec} />
      <div className="item-block__figures">
        <span className="item-block__price">{formatBrl(item.result.breakdown.finalPrice)}</span>
        {size && <span className="item-block__size">{size}</span>}
      </div>
    </>
  )
  if (!onOpen) return <div className="item-block__head">{body}</div>
  return (
    <button type="button" className="item-block__head" onClick={onOpen}>
      {body}
    </button>
  )
}

export function DraftBlockHead({ state, onOpen }: { state: ItemFormState; onOpen?: () => void }) {
  const { title, spec, size } = describeFormDraft(state)
  const body = (
    <>
      <ItemText title={title} spec={spec} />
      <div className="item-block__figures">
        <span className="item-draft__status">Rascunho</span>
        {size && <span className="item-block__size">{size}</span>}
      </div>
    </>
  )
  if (!onOpen) return <div className="item-block__head">{body}</div>
  return (
    <button type="button" className="item-block__head" onClick={onOpen}>
      {body}
    </button>
  )
}

function ItemText({ title, spec }: { title: string; spec?: string }) {
  return (
    <div className="item-block__info">
      <strong className="item-block__title">{title}</strong>
      {spec && (
        <span className="item-block__spec">
          {spec.split(' · ').map((part, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              <span className="item-block__spec-part">{part}</span>
            </span>
          ))}
        </span>
      )}
    </div>
  )
}

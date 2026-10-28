import type { ReactNode } from 'react'
import { describeFormDraft, describeItem } from '../domain/itemDescription'
import { formatBrl } from '../domain/quote'
import type { QuoteItem } from '../domain/types'
import type { ItemFormState } from '../data/itemDraft'

export function ItemBlockHead({ item, onOpen }: { item: QuoteItem; onOpen?: () => void }) {
  const { title, spec, size } = describeItem(item.input)
  const body = (
    <ItemHead
      title={title}
      spec={spec}
      aside={<span className="item-block__price">{formatBrl(item.result.breakdown.finalPrice)}</span>}
      size={size}
    />
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
    <ItemHead
      title={title}
      spec={spec}
      aside={<span className="item-draft__status">Rascunho</span>}
      size={size}
    />
  )
  if (!onOpen) return <div className="item-block__head">{body}</div>
  return (
    <button type="button" className="item-block__head" onClick={onOpen}>
      {body}
    </button>
  )
}

function ItemHead({
  title,
  spec,
  aside,
  size,
}: {
  title: string
  spec?: string
  aside: ReactNode
  size?: string
}) {
  return (
    <>
      <strong className="item-block__title">{title}</strong>
      {aside}
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
      {size && <span className="item-block__size">{size}</span>}
    </>
  )
}

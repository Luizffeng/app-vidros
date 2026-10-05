import { describeItem } from '../domain/itemDescription'
import { formatBrl } from '../domain/quote'
import type { QuoteItem } from '../domain/types'

export function ItemBlockHead({ item }: { item: QuoteItem }) {
  const { title, spec, size } = describeItem(item.input)
  return (
    <div className="item-block__head">
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
      <div className="item-block__figures">
        <span className="item-block__price">{formatBrl(item.result.breakdown.finalPrice)}</span>
        {size && <span className="item-block__size">{size}</span>}
      </div>
    </div>
  )
}

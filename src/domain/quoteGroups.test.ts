import { describe, expect, it } from 'vitest'
import { groupRevisions, quoteListIso } from './quoteGroups'
import type { Quote } from './types'

function quote(
  number: string,
  revision: number,
  status: Quote['status'],
  updatedAt: string,
  emittedAt?: string,
): Quote {
  return {
    id: `${number}-${revision}`,
    number,
    revision,
    status,
    createdAt: updatedAt,
    updatedAt,
    emittedAt,
    customer: { name: 'X' },
    items: [],
    additionalCosts: [],
    discounts: [],
    pricingVersion: '2026-07-10',
    itemsTotal: 0,
    additionalTotal: 0,
    discountTotal: 0,
    grandTotal: 0,
  } as Quote
}

describe('quoteListIso', () => {
  it('uses emission date for emitted and last edit for drafts', () => {
    expect(quoteListIso(quote('A', 1, 'emitted', '2026-10-05T10:00Z', '2026-10-03T10:00Z'))).toBe(
      '2026-10-03T10:00Z',
    )
    expect(quoteListIso(quote('A', 1, 'emitted', '2026-10-05T10:00Z'))).toBe('2026-10-05T10:00Z')
    expect(quoteListIso(quote('A', 2, 'draft', '2026-10-06T10:00Z'))).toBe('2026-10-06T10:00Z')
  })
})

describe('groupRevisions', () => {
  it('one group per number, revisions newest first, groups in input order', () => {
    const list = [
      quote('2026-0002', 1, 'draft', '2026-10-10T10:00Z'),
      quote('2026-0001', 1, 'emitted', '2026-10-09T10:00Z', '2026-10-01T10:00Z'),
      quote('2026-0001', 3, 'draft', '2026-10-08T10:00Z'),
      quote('2026-0001', 2, 'emitted', '2026-10-07T10:00Z', '2026-10-05T10:00Z'),
    ]
    const groups = groupRevisions(list)
    expect(groups.map((g) => g.number)).toEqual(['2026-0002', '2026-0001'])
    expect(groups[1].revisions.map((q) => q.revision)).toEqual([3, 2, 1])
  })

  it('same date falls back to the higher revision first', () => {
    const groups = groupRevisions([
      quote('A', 1, 'draft', '2026-10-08T10:00Z'),
      quote('A', 2, 'draft', '2026-10-08T10:00Z'),
    ])
    expect(groups[0].revisions.map((q) => q.revision)).toEqual([2, 1])
  })

  it('empty list gives no groups', () => {
    expect(groupRevisions([])).toEqual([])
  })
})

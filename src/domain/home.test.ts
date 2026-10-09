import { describe, expect, it } from 'vitest'
import { catalogUpdatedOn, quoteTileSummary, settingsPending } from './home'
import type { AppSettings, Quote } from './types'

const NOW = new Date(2026, 9, 9, 14, 0)

const day = (offset: number) => new Date(2026, 9, 9 + offset, 23, 59, 59, 999).toISOString()

function quote(status: Quote['status'], validUntil?: string): Quote {
  return {
    id: Math.random().toString(36),
    number: 'ORC-1',
    revision: 0,
    status,
    createdAt: day(-20),
    updatedAt: day(-20),
    emittedAt: status === 'emitted' ? day(-10) : undefined,
    validUntil,
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

const settings = (establishment: Partial<AppSettings['establishment']>): AppSettings =>
  ({
    quoteValidityDays: 15,
    marginMode: 'empresa',
    shareCta: '',
    establishment: { name: '', ...establishment },
  }) as AppSettings

describe('quoteTileSummary', () => {
  it('counts emitted expiring from today to today + 7 days', () => {
    const quotes = [
      quote('emitted', day(0)),
      quote('emitted', day(7)),
      quote('emitted', day(8)),
      quote('emitted', day(-1)),
      quote('draft'),
      quote('draft'),
    ]
    expect(quoteTileSummary(quotes, NOW)).toEqual({ expiring: 2, drafts: 2, emitted: 4, total: 6 })
  })

  it('computes validity for emitted quotes without validUntil', () => {
    // emitted 10 days ago + 15 default days = 5 days from now
    expect(quoteTileSummary([quote('emitted')], NOW, 15).expiring).toBe(1)
    expect(quoteTileSummary([quote('emitted')], NOW, 30).expiring).toBe(0)
  })

  it('handles an empty list', () => {
    expect(quoteTileSummary([], NOW)).toEqual({ expiring: 0, drafts: 0, emitted: 0, total: 0 })
  })
})

describe('catalogUpdatedOn', () => {
  it('reads day and minute versions', () => {
    expect(catalogUpdatedOn('2026-07-10')).toEqual(new Date(2026, 6, 10))
    expect(catalogUpdatedOn('2026-07-10T14:32')).toEqual(new Date(2026, 6, 10))
  })

  it('rejects other formats', () => {
    expect(catalogUpdatedOn('v1')).toBeNull()
    expect(catalogUpdatedOn('2026-02-31')).toBeNull()
    expect(catalogUpdatedOn('')).toBeNull()
  })
})

describe('settingsPending', () => {
  it('asks for a name and a phone', () => {
    expect(settingsPending(settings({}))).toEqual(['missing-name', 'missing-phone'])
    expect(settingsPending(settings({ tradeName: 'Forte', phone: ' ' }))).toEqual(['missing-phone'])
    expect(settingsPending(settings({ name: 'Forte', phone: '11999990000' }))).toEqual([])
  })
})

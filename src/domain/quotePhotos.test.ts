import { describe, expect, it } from 'vitest'
import {
  normalizeQuotePhotos,
  photoIsAvailable,
  QUOTE_PHOTO_RETENTION_MS,
  QUOTE_PHOTOS_MAX,
} from './quotePhotos'

describe('quotePhotos', () => {
  it('caps at 10 and drops invalid rows', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: `p${i}`,
      path: `path/${i}`,
      createdAt: '2026-10-01T00:00:00.000Z',
    }))
    expect(normalizeQuotePhotos(many)).toHaveLength(QUOTE_PHOTOS_MAX)
    expect(normalizeQuotePhotos([{ id: '', path: 'x', createdAt: '2026-01-01' }])).toEqual([])
  })

  it('retention: available inside 180 days, not after', () => {
    const now = new Date('2026-10-22T12:00:00.000Z')
    const fresh = {
      id: 'a',
      path: 'p',
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    }
    const old = {
      id: 'b',
      path: 'p',
      createdAt: new Date(now.getTime() - QUOTE_PHOTO_RETENTION_MS - 1000).toISOString(),
    }
    expect(photoIsAvailable(fresh, now)).toBe(true)
    expect(photoIsAvailable(old, now)).toBe(false)
  })
})

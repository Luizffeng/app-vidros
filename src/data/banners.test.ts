import { describe, expect, it } from 'vitest'
import { BANNERS, DEFAULT_BANNERS, MAX_BANNERS, visibleBanners, type Banner } from './banners'

const NOW = new Date(2026, 9, 9, 10)
const b = (id: string, from?: string, until?: string): Banner => ({ id, title: id, text: id, from, until })

describe('visibleBanners', () => {
  it('keeps banners inside the date window, both ends inclusive, in order', () => {
    const list = [b('a', '2026-10-09'), b('b', undefined, '2026-10-09'), b('c', '2026-10-10'), b('d', undefined, '2026-10-08')]
    expect(visibleBanners(list, NOW).map((x) => x.id)).toEqual(['a', 'b'])
  })

  it('caps at 5', () => {
    const list = Array.from({ length: 7 }, (_, i) => b(String(i)))
    expect(visibleBanners(list, NOW)).toHaveLength(MAX_BANNERS)
  })

  it('falls back to the default set below 2', () => {
    expect(visibleBanners([b('only')], NOW)).toEqual(DEFAULT_BANNERS)
    expect(visibleBanners([], NOW)).toEqual(DEFAULT_BANNERS)
  })

  it('ships at least 2 banners', () => {
    expect(visibleBanners(BANNERS, NOW).length).toBeGreaterThanOrEqual(2)
    expect(DEFAULT_BANNERS.length).toBeGreaterThanOrEqual(2)
  })
})

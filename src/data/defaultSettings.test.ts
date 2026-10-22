import { describe, expect, it } from 'vitest'
import type { AppSettings } from '../domain/types'
import { defaultSettings, normalizeSettings } from './defaultSettings'

describe('normalizeSettings marginMode', () => {
  it('defaults to empresa', () => {
    expect(defaultSettings().marginMode).toBe('empresa')
    expect(normalizeSettings(null).marginMode).toBe('empresa')
  })

  it('treats old settings without the field as empresa', () => {
    expect(normalizeSettings({ quoteValidityDays: 10 }).marginMode).toBe('empresa')
  })

  it('rejects unknown values', () => {
    const raw = { marginMode: 'lucro' } as unknown as Partial<AppSettings>
    expect(normalizeSettings(raw).marginMode).toBe('empresa')
  })

  it('keeps each valid mode', () => {
    for (const mode of ['empresa', 'vendedor', 'autonomo'] as const) {
      expect(normalizeSettings({ marginMode: mode }).marginMode).toBe(mode)
    }
  })
})

describe('normalizeSettings onboardingDismissedAt', () => {
  it('keeps a string date; old settings have none', () => {
    expect(normalizeSettings({ onboardingDismissedAt: '2026-10-14T12:00:00.000Z' }).onboardingDismissedAt).toBe(
      '2026-10-14T12:00:00.000Z',
    )
    expect('onboardingDismissedAt' in normalizeSettings({ quoteValidityDays: 10 })).toBe(false)
  })
})

describe('normalizeSettings paymentTerms', () => {
  it('defaults to empty; old settings without the field stay empty', () => {
    expect(defaultSettings().paymentTerms).toBe('')
    expect(normalizeSettings({ quoteValidityDays: 10 }).paymentTerms).toBe('')
  })

  it('trims and caps at 500; whitespace-only becomes empty', () => {
    expect(normalizeSettings({ paymentTerms: '  Pix à vista.  ' }).paymentTerms).toBe('Pix à vista.')
    expect(normalizeSettings({ paymentTerms: '   ' }).paymentTerms).toBe('')
    expect(normalizeSettings({ paymentTerms: 'x'.repeat(520) }).paymentTerms).toHaveLength(500)
  })
})

describe('normalizeSettings marginModeChangedAt', () => {
  it('keeps a string date and drops anything else', () => {
    expect(normalizeSettings({ marginModeChangedAt: '2026-10-07T18:00:00.000Z' }).marginModeChangedAt).toBe(
      '2026-10-07T18:00:00.000Z',
    )
    const raw = { marginModeChangedAt: 42 } as unknown as Partial<AppSettings>
    expect(normalizeSettings(raw).marginModeChangedAt).toBeUndefined()
  })
})

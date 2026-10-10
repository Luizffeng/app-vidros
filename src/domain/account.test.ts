import { describe, expect, it } from 'vitest'
import { accountState, shortId, supportMessage } from './account'
import type { Account } from './types'

const NOW = new Date('2026-10-10T12:00:00Z')

function at(days: number): string {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
}

function account(patch: Partial<Account> = {}): Account {
  return {
    id: 'e53267a4-5c7d-40e3-8609-58dd99e7eb33',
    name: 'Vidraçaria Teste',
    whatsapp: '11987654321',
    plan: 'trial',
    trialEndsAt: at(30),
    termsAcceptedAt: at(0),
    createdAt: at(0),
    ...patch,
  }
}

describe('accountState', () => {
  it('trial on day 1 has 30 days left without warning', () => {
    expect(accountState(account(), NOW)).toEqual({
      kind: 'trial',
      endsAt: at(30),
      daysLeft: 30,
      warn: false,
      canWrite: true,
    })
  })

  it('warns from 7 days left, not at 8', () => {
    expect(accountState(account({ trialEndsAt: at(8) }), NOW).warn).toBe(false)
    expect(accountState(account({ trialEndsAt: at(7) }), NOW).warn).toBe(true)
    expect(accountState(account({ trialEndsAt: at(1) }), NOW)).toMatchObject({ daysLeft: 1, warn: true })
  })

  it('rounds partial days up', () => {
    expect(accountState(account({ trialEndsAt: at(0.2) }), NOW)).toMatchObject({ daysLeft: 1, canWrite: true })
    expect(accountState(account({ trialEndsAt: at(6.5) }), NOW).daysLeft).toBe(7)
  })

  it('expires the trial at the end instant', () => {
    expect(accountState(account({ trialEndsAt: at(0) }), NOW)).toEqual({
      kind: 'expired',
      reason: 'trial',
      endsAt: at(0),
      warn: false,
      canWrite: false,
    })
    expect(accountState(account({ trialEndsAt: at(-3) }), NOW).kind).toBe('expired')
  })

  it('active without end never warns nor expires', () => {
    expect(accountState(account({ plan: 'active', trialEndsAt: at(-400) }), NOW)).toEqual({
      kind: 'active',
      warn: false,
      canWrite: true,
    })
  })

  it('active with end warns and expires as subscription', () => {
    expect(accountState(account({ plan: 'active', activeUntil: at(5) }), NOW)).toMatchObject({
      kind: 'active',
      daysLeft: 5,
      warn: true,
      canWrite: true,
    })
    expect(accountState(account({ plan: 'active', activeUntil: at(-1) }), NOW)).toMatchObject({
      kind: 'expired',
      reason: 'subscription',
      canWrite: false,
    })
  })

  it('active plan ignores the old trial end', () => {
    expect(accountState(account({ plan: 'active', trialEndsAt: at(-10), activeUntil: at(20) }), NOW).canWrite).toBe(true)
  })

  it('disabled wins over any plan', () => {
    expect(accountState(account({ plan: 'active', disabledAt: at(-1) }), NOW)).toEqual({
      kind: 'disabled',
      warn: false,
      canWrite: false,
    })
  })
})

describe('support helpers', () => {
  it('short id is the first 8 hex chars', () => {
    expect(shortId('e53267a4-5c7d-40e3-8609-58dd99e7eb33')).toBe('e53267a4')
  })

  it('messages identify the shop', () => {
    const a = account()
    expect(supportMessage('talk', a)).toBe('Olá! Sou da Vidraçaria Teste (e53267a4).')
    expect(supportMessage('subscribe', a)).toContain('Quero assinar')
    expect(supportMessage('renew', a)).toContain('renovar')
  })
})

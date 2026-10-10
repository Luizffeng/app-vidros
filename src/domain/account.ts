import type { Account, AccountState } from './types'

const DAY_MS = 24 * 60 * 60 * 1000
export const WARN_DAYS = 7

function daysUntil(endsAt: string, now: Date): number {
  return Math.ceil((new Date(endsAt).getTime() - now.getTime()) / DAY_MS)
}

/** Mesmas regras de `account_can_write()` no Supabase. */
export function accountState(account: Account, now: Date = new Date()): AccountState {
  if (account.disabledAt) return { kind: 'disabled', warn: false, canWrite: false }

  const reason = account.plan === 'trial' ? 'trial' : 'subscription'
  const endsAt = account.plan === 'trial' ? account.trialEndsAt : account.activeUntil
  if (!endsAt) return { kind: 'active', warn: false, canWrite: true }

  if (now.getTime() >= new Date(endsAt).getTime()) {
    return { kind: 'expired', reason, endsAt, warn: false, canWrite: false }
  }

  const daysLeft = daysUntil(endsAt, now)
  return {
    kind: account.plan === 'trial' ? 'trial' : 'active',
    endsAt,
    daysLeft,
    warn: daysLeft <= WARN_DAYS,
    canWrite: true,
  }
}

/** Identificador curto que o suporte usa para achar a conta. */
export function shortId(id: string): string {
  return id.replace(/-/g, '').slice(0, 8)
}

export type SupportIntent = 'talk' | 'subscribe' | 'renew'

export function supportMessage(intent: SupportIntent, account: Pick<Account, 'id' | 'name'>): string {
  const who = `${account.name} (${shortId(account.id)})`
  if (intent === 'subscribe') return `Olá! Quero assinar o App Vidros. Loja: ${who}`
  if (intent === 'renew') return `Olá! Quero renovar minha assinatura do App Vidros. Loja: ${who}`
  return `Olá! Sou da ${who}.`
}

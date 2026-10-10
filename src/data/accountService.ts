import type { SupabaseClient } from '@supabase/supabase-js'
import type { Account, AccountService, Suggestion } from '../domain/types'
import { getSupabase } from './supabaseClient'

type AccountRow = {
  id: string
  name: string
  whatsapp: string
  plan: 'trial' | 'active'
  trial_ends_at: string
  active_until: string | null
  disabled_at: string | null
  terms_accepted_at: string
  marketing_opt_in_at: string | null
  created_at: string
}

type SuggestionRow = {
  id: string
  body: string
  status: Suggestion['status']
  reply: string | null
  replied_at: string | null
  shipped_version: string | null
  created_at: string
}

function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    whatsapp: row.whatsapp,
    plan: row.plan,
    trialEndsAt: row.trial_ends_at,
    activeUntil: row.active_until ?? undefined,
    disabledAt: row.disabled_at ?? undefined,
    termsAcceptedAt: row.terms_accepted_at,
    marketingOptInAt: row.marketing_opt_in_at ?? undefined,
    createdAt: row.created_at,
  }
}

function toSuggestion(row: SuggestionRow): Suggestion {
  return {
    id: row.id,
    body: row.body,
    status: row.status,
    reply: row.reply ?? undefined,
    repliedAt: row.replied_at ?? undefined,
    shippedVersion: row.shipped_version ?? undefined,
    createdAt: row.created_at,
  }
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

export class SupabaseAccountService implements AccountService {
  private readonly supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  async getMyAccount(): Promise<Account | null> {
    const { data, error } = await this.supabase.from('accounts').select('*').maybeSingle()
    fail(error)
    return data ? toAccount(data as AccountRow) : null
  }

  async createAccount(input: { name: string; whatsapp: string; marketingOptIn: boolean }): Promise<Account> {
    const { data, error } = await this.supabase.rpc('create_account', {
      p_name: input.name,
      p_whatsapp: input.whatsapp,
      p_marketing_opt_in: input.marketingOptIn,
    })
    fail(error)
    return toAccount(data as AccountRow)
  }

  async setMarketingOptIn(value: boolean): Promise<void> {
    const { error } = await this.supabase.rpc('set_marketing_opt_in', { p_value: value })
    fail(error)
  }

  async listSuggestions(): Promise<Suggestion[]> {
    const { data, error } = await this.supabase
      .from('suggestions')
      .select('id, body, status, reply, replied_at, shipped_version, created_at')
      .order('created_at', { ascending: false })
    fail(error)
    return ((data ?? []) as SuggestionRow[]).map(toSuggestion)
  }

  async sendSuggestion(body: string): Promise<void> {
    const { error } = await this.supabase.from('suggestions').insert({ body: body.trim() })
    fail(error)
  }

  async deleteMyAccount(): Promise<void> {
    const { data: accountId } = await this.supabase.rpc('current_account_id')
    if (typeof accountId === 'string') {
      await this.supabase.storage.from('logos').remove([`${accountId}/logo.png`])
    }
    const { error } = await this.supabase.rpc('delete_my_account')
    fail(error)
    await this.supabase.auth.signOut()
  }
}

const LOCAL_SUGGESTIONS_KEY = 'app-vidros:suggestions'

/** Modo local (sem Supabase): uma conta ativa, sem teste. */
export class LocalAccountService implements AccountService {
  private readonly account: Account = {
    id: '00000000-0000-0000-0000-000000000000',
    name: 'Modo local',
    whatsapp: '',
    plan: 'active',
    trialEndsAt: '1970-01-01T00:00:00.000Z',
    termsAcceptedAt: '1970-01-01T00:00:00.000Z',
    createdAt: '1970-01-01T00:00:00.000Z',
  }

  async getMyAccount(): Promise<Account> {
    return this.account
  }

  async createAccount(): Promise<Account> {
    return this.account
  }

  async setMarketingOptIn(): Promise<void> {}

  async listSuggestions(): Promise<Suggestion[]> {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_SUGGESTIONS_KEY) ?? '[]') as Suggestion[]
    } catch {
      return []
    }
  }

  async sendSuggestion(body: string): Promise<void> {
    const list = await this.listSuggestions()
    const suggestion: Suggestion = {
      id: crypto.randomUUID(),
      body: body.trim(),
      status: 'recebida',
      createdAt: new Date().toISOString(),
    }
    localStorage.setItem(LOCAL_SUGGESTIONS_KEY, JSON.stringify([suggestion, ...list]))
  }

  async deleteMyAccount(): Promise<void> {}
}

export function createAccountService(): AccountService {
  const supabase = getSupabase()
  if (supabase) return new SupabaseAccountService(supabase)
  return new LocalAccountService()
}

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppSettings, Catalog, Quote, QuoteRepository } from '../domain/types'
import { phoneDigits } from '../domain/brazil'
import { normalizeQuote } from '../domain/quote'
import { normalizeCatalog } from './catalogItems'
import { defaultSettings, normalizeSettings } from './defaultSettings'
import { loadSeedCatalog } from './seedCatalog'

const LOGO_BUCKET = 'logos'

type CatalogRow = { payload: Catalog }
type SettingsRow = { payload: Partial<AppSettings>; logo_path: string | null }
type QuoteRow = { id: string; updated_at: string; payload: Quote }

function isDenied(error: { message: string; code?: string }): boolean {
  return error.code === '42501' || /row-level security/i.test(error.message)
}

function fail(error: { message: string; code?: string } | null): void {
  if (!error) return
  if (isDenied(error)) throw new Error('Sua conta está em modo consulta. Nada foi gravado.')
  throw new Error(error.message)
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(',')
  const mime = /data:(.*?);/.exec(header ?? '')?.[1] ?? 'image/png'
  const binary = atob(b64 ?? '')
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Logo inválida.'))
    reader.readAsDataURL(blob)
  })
}

export class SupabaseQuoteRepository implements QuoteRepository {
  private readonly supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  async listQuotes(): Promise<Quote[]> {
    const { data, error } = await this.supabase
      .from('quotes')
      .select('payload')
      .order('updated_at', { ascending: false })
    fail(error)
    return ((data ?? []) as Pick<QuoteRow, 'payload'>[]).map((row) => normalizeQuote(row.payload))
  }

  async getQuote(id: string): Promise<Quote | null> {
    const { data, error } = await this.supabase
      .from('quotes')
      .select('payload')
      .eq('id', id)
      .maybeSingle()
    fail(error)
    const payload = (data as Pick<QuoteRow, 'payload'> | null)?.payload
    return payload ? normalizeQuote(payload) : null
  }

  async saveQuote(quote: Quote): Promise<void> {
    const { error } = await this.supabase.from('quotes').upsert({
      id: quote.id,
      updated_at: quote.updatedAt,
      payload: quote,
    })
    fail(error)
  }

  async deleteQuote(id: string): Promise<void> {
    const { error } = await this.supabase.from('quotes').delete().eq('id', id)
    fail(error)
  }

  /** RLS já limita catálogo e configurações à conta da sessão; `account_id` vem do default da coluna. */
  async getCatalog(): Promise<Catalog> {
    const { data, error } = await this.supabase.from('catalog').select('payload').maybeSingle()
    fail(error)
    const row = data as CatalogRow | null
    if (row?.payload) return normalizeCatalog(row.payload)

    const seed = normalizeCatalog(loadSeedCatalog())
    const inserted = await this.supabase.from('catalog').insert({ payload: seed })
    if (inserted.error?.code === '23505') return this.getCatalog()
    if (inserted.error && isDenied(inserted.error)) return seed
    fail(inserted.error)
    return seed
  }

  async saveCatalog(catalog: Catalog): Promise<void> {
    const normalized = normalizeCatalog(catalog)
    const { error } = await this.supabase
      .from('catalog')
      .upsert({ payload: normalized, updated_at: new Date().toISOString() }, { onConflict: 'account_id' })
    fail(error)
  }

  private async logoPath(): Promise<string> {
    const { data, error } = await this.supabase.rpc('current_account_id')
    fail(error)
    if (typeof data !== 'string') throw new Error('Conta não encontrada.')
    return `${data}/logo.png`
  }

  async getSettings(): Promise<AppSettings> {
    const { data, error } = await this.supabase.from('settings').select('payload, logo_path').maybeSingle()
    fail(error)
    const row = data as SettingsRow | null
    if (!row) {
      const fresh = await this.freshSettings()
      const inserted = await this.supabase.from('settings').insert({ payload: fresh, logo_path: null })
      if (inserted.error?.code === '23505') return this.getSettings()
      if (inserted.error) return fresh
      return fresh
    }

    const settings = normalizeSettings(row.payload)
    if (!row.logo_path) return settings
    const file = await this.supabase.storage.from(LOGO_BUCKET).download(row.logo_path)
    if (file.error || !file.data) return settings
    settings.logoDataUrl = await blobToDataUrl(file.data)
    return settings
  }

  /** Conta nova: nome e WhatsApp do cadastro, sem logo (o logo embutido é da Forte Vidros). */
  private async freshSettings(): Promise<AppSettings> {
    const base = defaultSettings()
    const { data } = await this.supabase.from('accounts').select('name, whatsapp').maybeSingle()
    const account = data as { name: string; whatsapp: string } | null
    return {
      ...base,
      logoDataUrl: undefined,
      establishment: {
        ...base.establishment,
        name: account?.name ?? base.establishment.name,
        phone: phoneDigits(account?.whatsapp ?? ''),
      },
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const normalized = normalizeSettings(settings)
    const path = await this.logoPath()
    let logoPath: string | null = null
    if (normalized.logoDataUrl) {
      const uploaded = await this.supabase.storage
        .from(LOGO_BUCKET)
        .upload(path, dataUrlToBlob(normalized.logoDataUrl), {
          upsert: true,
          contentType: 'image/png',
        })
      fail(uploaded.error)
      logoPath = path
    } else {
      await this.supabase.storage.from(LOGO_BUCKET).remove([path])
    }

    const { logoDataUrl: _logo, ...payload } = normalized
    void _logo
    const { error } = await this.supabase
      .from('settings')
      .upsert(
        { payload, logo_path: logoPath, updated_at: new Date().toISOString() },
        { onConflict: 'account_id' },
      )
    fail(error)
  }

  async nextQuoteNumber(): Promise<string> {
    const { data, error } = await this.supabase.rpc('next_quote_number')
    fail(error)
    if (typeof data !== 'string') throw new Error('Sequência de orçamento inválida.')
    return data
  }
}

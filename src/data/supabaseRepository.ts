import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppSettings, Catalog, Quote, QuoteRepository } from '../domain/types'
import { normalizeQuote } from '../domain/quote'
import { normalizeCatalog } from './catalogItems'
import { defaultSettings, normalizeSettings } from './defaultSettings'
import { loadSeedCatalog } from './seedCatalog'

const LOGO_BUCKET = 'logos'
const LOGO_PATH = 'shop/logo.png'

type CatalogRow = { id: string; payload: Catalog }
type SettingsRow = { id: string; payload: Partial<AppSettings>; logo_path: string | null }
type QuoteRow = { id: string; updated_at: string; payload: Quote }

function fail(error: { message: string; code?: string } | null): void {
  if (!error) return
  if (error.code === '42501' || /row-level security/i.test(error.message)) {
    throw new Error('Sem permissão para gravar.')
  }
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

  async getCatalog(): Promise<Catalog> {
    const { data, error } = await this.supabase
      .from('catalog')
      .select('payload')
      .eq('id', 'current')
      .maybeSingle()
    fail(error)
    const row = data as Pick<CatalogRow, 'payload'> | null
    if (row?.payload) return normalizeCatalog(row.payload)

    const seed = normalizeCatalog(loadSeedCatalog())
    const inserted = await this.supabase.from('catalog').insert({
      id: 'current',
      payload: seed,
    })
    if (inserted.error?.code === '23505') return this.getCatalog()
    fail(inserted.error)
    return seed
  }

  async saveCatalog(catalog: Catalog): Promise<void> {
    const normalized = normalizeCatalog(catalog)
    const { error } = await this.supabase.from('catalog').upsert({
      id: 'current',
      payload: normalized,
      updated_at: new Date().toISOString(),
    })
    fail(error)
  }

  async getSettings(): Promise<AppSettings> {
    const { data, error } = await this.supabase
      .from('settings')
      .select('payload, logo_path')
      .eq('id', 'current')
      .maybeSingle()
    fail(error)
    const row = data as Pick<SettingsRow, 'payload' | 'logo_path'> | null
    if (!row) {
      const fresh = defaultSettings()
      const inserted = await this.supabase.from('settings').insert({
        id: 'current',
        payload: fresh,
        logo_path: null,
      })
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

  async saveSettings(settings: AppSettings): Promise<void> {
    const normalized = normalizeSettings(settings)
    let logoPath: string | null = null
    if (normalized.logoDataUrl) {
      const uploaded = await this.supabase.storage
        .from(LOGO_BUCKET)
        .upload(LOGO_PATH, dataUrlToBlob(normalized.logoDataUrl), {
          upsert: true,
          contentType: 'image/png',
        })
      fail(uploaded.error)
      logoPath = LOGO_PATH
    } else {
      await this.supabase.storage.from(LOGO_BUCKET).remove([LOGO_PATH])
    }

    const { logoDataUrl: _logo, ...payload } = normalized
    void _logo
    const { error } = await this.supabase.from('settings').upsert({
      id: 'current',
      payload,
      logo_path: logoPath,
      updated_at: new Date().toISOString(),
    })
    fail(error)
  }

  async nextQuoteNumber(): Promise<string> {
    const { data, error } = await this.supabase.rpc('next_quote_number')
    fail(error)
    if (typeof data !== 'string') throw new Error('Sequência de orçamento inválida.')
    return data
  }
}

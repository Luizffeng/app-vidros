import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { getSupabase } from './supabaseClient'
import { SupabaseQuoteRepository } from './supabaseRepository'
import { normalizeQuote } from '../domain/quote'
import type { AppSettings, Catalog, Quote, QuoteRepository } from '../domain/types'
import { normalizeCatalog, withRequiredAluminios } from './catalogItems'
import { defaultSettings, normalizeSettings } from './defaultSettings'
import { loadSeedCatalog } from './seedCatalog'

interface AppVidrosDB extends DBSchema {
  quotes: {
    key: string
    value: Quote
    indexes: { 'by-updated': string }
  }
  meta: {
    key: string
    value: { key: string; value: unknown }
  }
  catalog: {
    key: string
    value: Catalog & { id: string }
  }
}

// Nome legado: trocar abre banco vazio e esconde os dados locais já gravados.
const DB_NAME = 'forte-vidros'
const DB_VERSION = 1
const SETTINGS_KEY = 'app-settings'

async function getDb(): Promise<IDBPDatabase<AppVidrosDB>> {
  return openDB<AppVidrosDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('quotes')) {
        const store = db.createObjectStore('quotes', { keyPath: 'id' })
        store.createIndex('by-updated', 'updatedAt')
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains('catalog')) {
        db.createObjectStore('catalog', { keyPath: 'id' })
      }
    },
  })
}

/**
 * Local IndexedDB adapter.
 * Swap this class for a remote API implementation later without changing UI/domain.
 */
export class LocalQuoteRepository implements QuoteRepository {
  async listQuotes(): Promise<Quote[]> {
    const db = await getDb()
    const all = await db.getAll('quotes')
    return all.map(normalizeQuote).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async getQuote(id: string): Promise<Quote | null> {
    const db = await getDb()
    const quote = await db.get('quotes', id)
    return quote ? normalizeQuote(quote) : null
  }

  async saveQuote(quote: Quote): Promise<void> {
    const db = await getDb()
    await db.put('quotes', quote)
  }

  async deleteQuote(id: string): Promise<void> {
    const db = await getDb()
    await db.delete('quotes', id)
  }

  async getCatalog(): Promise<Catalog> {
    const db = await getDb()
    const stored = await db.get('catalog', 'current')
    if (stored) {
      const { id, ...catalog } = stored
      void id
      const normalized = normalizeCatalog(catalog)
      const next = withRequiredAluminios(normalized)
      if (next !== normalized) await db.put('catalog', { ...next, id: 'current' })
      return next
    }
    const seed = normalizeCatalog(loadSeedCatalog())
    await db.put('catalog', { ...seed, id: 'current' })
    return seed
  }

  async saveCatalog(catalog: Catalog): Promise<void> {
    const db = await getDb()
    const normalized = normalizeCatalog(catalog)
    await db.put('catalog', { ...normalized, id: 'current' })
  }

  async getSettings(): Promise<AppSettings> {
    const db = await getDb()
    const row = (await db.get('meta', SETTINGS_KEY)) as
      | { key: string; value: Partial<AppSettings> }
      | undefined
    if (row?.value) return normalizeSettings(row.value)

    // Migra validade antiga do catálogo, se existir
    const catalog = await this.getCatalog()
    const legacyDays = (catalog.config as PricingConfigLegacy).quoteValidityDays
    const migrated = normalizeSettings({
      ...defaultSettings(),
      quoteValidityDays: legacyDays,
    })
    await db.put('meta', { key: SETTINGS_KEY, value: migrated })
    return migrated
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await getDb()
    await db.put('meta', {
      key: SETTINGS_KEY,
      value: normalizeSettings(settings),
    })
  }

  async nextQuoteNumber(): Promise<string> {
    const db = await getDb()
    const year = new Date().getFullYear()
    const key = `seq-${year}`
    const current = (await db.get('meta', key)) as
      | { key: string; value: number }
      | undefined
    const next = (current?.value ?? 0) + 1
    await db.put('meta', { key, value: next })
    return `ORC-${year}-${String(next).padStart(4, '0')}`
  }

  async uploadQuotePhoto(_photoId: string, blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Falha ao gravar a foto.'))
      reader.readAsDataURL(blob)
    })
  }

  async getQuotePhotoUrl(path: string): Promise<string> {
    return path
  }

  async deleteQuotePhoto(_path: string): Promise<void> {
    /* Local photos live in the quote JSON (data URL); removing the ref is enough. */
  }
}

type PricingConfigLegacy = { quoteValidityDays?: number }

/** Remoto quando as env do Supabase existem. Sem elas, IndexedDB local. */
export function createRepository(): QuoteRepository {
  const supabase = getSupabase()
  if (supabase) return new SupabaseQuoteRepository(supabase)
  return new LocalQuoteRepository()
}

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Catalog, Quote, QuoteRepository } from '../domain/types'
import { loadSeedCatalog } from './seedCatalog'

interface ForteVidrosDB extends DBSchema {
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

const DB_NAME = 'forte-vidros'
const DB_VERSION = 1

async function getDb(): Promise<IDBPDatabase<ForteVidrosDB>> {
  return openDB<ForteVidrosDB>(DB_NAME, DB_VERSION, {
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
    return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async getQuote(id: string): Promise<Quote | null> {
    const db = await getDb()
    return (await db.get('quotes', id)) ?? null
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
      return catalog
    }
    const seed = loadSeedCatalog()
    await db.put('catalog', { ...seed, id: 'current' })
    return seed
  }

  async saveCatalog(catalog: Catalog): Promise<void> {
    const db = await getDb()
    await db.put('catalog', { ...catalog, id: 'current' })
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
}

/** Factory — change here when remote backend is ready */
export function createRepository(): QuoteRepository {
  return new LocalQuoteRepository()
}

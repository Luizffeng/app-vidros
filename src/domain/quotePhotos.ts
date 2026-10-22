import type { QuotePhoto } from './types'

export const QUOTE_PHOTOS_MAX = 10
/** 6 × 30 days */
export const QUOTE_PHOTO_RETENTION_MS = 180 * 24 * 60 * 60 * 1000

export function photoIsAvailable(photo: QuotePhoto, now = new Date()): boolean {
  const t = Date.parse(photo.createdAt)
  if (!Number.isFinite(t)) return false
  return now.getTime() - t < QUOTE_PHOTO_RETENTION_MS
}

export function normalizeQuotePhotos(raw: unknown): QuotePhoto[] {
  if (!Array.isArray(raw)) return []
  const out: QuotePhoto[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    if (typeof r.id !== 'string' || typeof r.path !== 'string' || typeof r.createdAt !== 'string') continue
    if (!r.id.trim() || !r.path.trim()) continue
    out.push({ id: r.id, path: r.path, createdAt: r.createdAt })
    if (out.length >= QUOTE_PHOTOS_MAX) break
  }
  return out
}

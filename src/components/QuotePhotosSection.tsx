import { useEffect, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { fileToQuotePhotoBlob } from '../data/quotePhoto'
import { photoIsAvailable, QUOTE_PHOTOS_MAX } from '../domain/quotePhotos'
import type { QuotePhoto, QuoteRepository } from '../domain/types'
import { Banner } from './Banner'
import { Section } from './Section'

export function QuotePhotosSection({
  photos,
  canEdit,
  repo,
  busy,
  onChange,
}: {
  photos: QuotePhoto[]
  canEdit: boolean
  repo: QuoteRepository
  busy: boolean
  onChange: (photos: QuotePhoto[]) => Promise<void>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const atMax = photos.length >= QUOTE_PHOTOS_MAX

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const next: Record<string, string> = {}
      for (const photo of photos) {
        if (!photoIsAvailable(photo)) continue
        try {
          next[photo.id] = await repo.getQuotePhotoUrl(photo.path)
        } catch {
          /* skip broken */
        }
      }
      if (!cancelled) setUrls(next)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [photos, repo])

  const onPick = async (file: File | undefined) => {
    if (!file || !canEdit) return
    if (atMax) {
      setError(`Máximo de ${QUOTE_PHOTOS_MAX} fotos neste orçamento.`)
      return
    }
    setError(null)
    setUploading(true)
    try {
      const blob = await fileToQuotePhotoBlob(file)
      const id = uuid()
      const path = await repo.uploadQuotePhoto(id, blob)
      const photo: QuotePhoto = { id, path, createdAt: new Date().toISOString() }
      await onChange([...photos, photo])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const onRemove = async (photo: QuotePhoto) => {
    if (!canEdit) return
    const next = photos.filter((p) => p.id !== photo.id)
    await onChange(next)
    const stillUsed = next.some((p) => p.path === photo.path)
    if (!stillUsed) {
      try {
        await repo.deleteQuotePhoto(photo.path)
      } catch {
        /* ignore storage cleanup errors */
      }
    }
  }

  return (
    <Section
      title="Fotos"
      hint="Adicione fotos da obra, projetos, medidas ou anotações."
      count={photos.length > 0 ? `${photos.length}/${QUOTE_PHOTOS_MAX}` : undefined}
    >
      {error && <Banner tone="error">{error}</Banner>}
      {photos.length > 0 && (
        <ul className="quote-photos">
          {photos.map((photo) => {
            const available = photoIsAvailable(photo)
            const src = urls[photo.id]
            return (
              <li key={photo.id} className="quote-photos__item">
                {available && src ? (
                  <a href={src} target="_blank" rel="noreferrer" className="quote-photos__thumb">
                    <img src={src} alt="" />
                  </a>
                ) : (
                  <span className="quote-photos__expired muted">Expirada</span>
                )}
                {canEdit && (
                  <button
                    type="button"
                    className="btn link danger"
                    disabled={busy || uploading}
                    onClick={() => void onRemove(photo)}
                  >
                    Remover
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {canEdit && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => void onPick(e.target.files?.[0])}
          />
          <button
            type="button"
            className="btn"
            disabled={busy || uploading || atMax}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? 'Enviando…' : 'Adicionar foto'}
          </button>
          {atMax && (
            <p className="btn-reason">Máximo de {QUOTE_PHOTOS_MAX} fotos neste orçamento.</p>
          )}
        </>
      )}
    </Section>
  )
}

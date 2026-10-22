import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { v4 as uuid } from 'uuid'
import { fileToQuotePhotoBlob } from '../data/quotePhoto'
import { photoIsAvailable, QUOTE_PHOTOS_MAX } from '../domain/quotePhotos'
import type { QuotePhoto, QuoteRepository } from '../domain/types'
import { Banner } from './Banner'
import { CollapsibleSection } from './CollapsibleSection'
import { IconButton } from './IconButton'
import { Modal } from './Modal'
import { useDismiss } from './useDismiss'
import { usePresence } from './usePresence'

const ZOOM_MIN = 1
const ZOOM_MAX = 5

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
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const filesInputRef = useRef<HTMLInputElement>(null)
  const addWrapRef = useRef<HTMLDivElement>(null)
  const addBtnRef = useRef<HTMLButtonElement>(null)
  const firstOptRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const pickerPop = usePresence(pickerOpen, 'xs')
  const atMax = photos.length >= QUOTE_PHOTOS_MAX

  const viewable = photos.filter((p) => photoIsAvailable(p) && urls[p.id])

  useDismiss(pickerOpen, addWrapRef, (reason) => {
    setPickerOpen(false)
    if (reason === 'escape') addBtnRef.current?.focus({ preventScroll: true })
  })

  useEffect(() => {
    if (pickerOpen) firstOptRef.current?.focus({ preventScroll: true })
  }, [pickerOpen])

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

  useEffect(() => {
    if (viewerIndex === null) return
    if (viewable.length === 0) {
      setViewerIndex(null)
      return
    }
    if (viewerIndex >= viewable.length) setViewerIndex(viewable.length - 1)
  }, [viewerIndex, viewable.length])

  const openSource = (kind: 'gallery' | 'camera' | 'files') => {
    setPickerOpen(false)
    const ref =
      kind === 'gallery' ? galleryInputRef : kind === 'camera' ? cameraInputRef : filesInputRef
    // Next tick so dismiss / presence do not steal the synthetic click.
    window.setTimeout(() => ref.current?.click(), 0)
  }

  const onPickFiles = async (list: FileList | null) => {
    if (!list?.length || !canEdit) return
    const room = QUOTE_PHOTOS_MAX - photos.length
    if (room <= 0) {
      setError(`Máximo de ${QUOTE_PHOTOS_MAX} fotos neste orçamento.`)
      return
    }
    const chosen = [...list].slice(0, room)
    setError(null)
    setUploading(true)
    let next = photos
    let failed: string | null = null
    try {
      for (const file of chosen) {
        try {
          const blob = await fileToQuotePhotoBlob(file)
          const id = uuid()
          const path = await repo.uploadQuotePhoto(id, blob)
          next = [...next, { id, path, createdAt: new Date().toISOString() }]
        } catch (e) {
          failed = e instanceof Error ? e.message : String(e)
          break
        }
      }
      if (next !== photos) await onChange(next)
      if (list.length > room) {
        setError(`Só cabem mais ${room} foto${room === 1 ? '' : 's'} (máx. ${QUOTE_PHOTOS_MAX}).`)
      } else if (failed) {
        setError(failed)
      }
    } finally {
      setUploading(false)
      for (const ref of [galleryInputRef, cameraInputRef, filesInputRef]) {
        if (ref.current) ref.current.value = ''
      }
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

  const openViewer = (photoId: string) => {
    const index = viewable.findIndex((p) => p.id === photoId)
    if (index >= 0) setViewerIndex(index)
  }

  const stepViewer = (delta: number) => {
    if (viewerIndex === null || viewable.length === 0) return
    setViewerIndex((viewerIndex + delta + viewable.length) % viewable.length)
  }

  const viewerPhoto = viewerIndex !== null ? viewable[viewerIndex] : undefined
  const viewerSrc = viewerPhoto ? urls[viewerPhoto.id] : undefined

  return (
    <CollapsibleSection
      title="Fotos"
      count={`${photos.length}/${QUOTE_PHOTOS_MAX}`}
      defaultOpen={photos.length > 0}
    >
      <p className="section-hint">Adicione fotos da obra, projetos, medidas ou anotações.</p>
      {error && <Banner tone="error">{error}</Banner>}
      <ul className="quote-photos">
        {canEdit && !atMax && (
          <li className="quote-photos__item quote-photos__item--add">
            <div className="photo-add-wrap" ref={addWrapRef}>
              <button
                ref={addBtnRef}
                type="button"
                className="quote-photos__add"
                disabled={busy || uploading}
                aria-label={uploading ? 'Enviando foto' : 'Adicionar foto'}
                aria-haspopup="menu"
                aria-expanded={pickerOpen}
                aria-controls={pickerOpen ? menuId : undefined}
                onClick={() => setPickerOpen((v) => !v)}
              >
                {uploading ? <span className="quote-photos__add-busy">…</span> : <PlusIcon />}
              </button>
              {pickerPop.mounted && (
                <div
                  className="photo-add-pop"
                  id={menuId}
                  role="menu"
                  aria-label="Adicionar foto"
                  data-state={pickerPop.state}
                >
                  <button
                    ref={firstOptRef}
                    type="button"
                    role="menuitem"
                    className="send-option"
                    onClick={() => openSource('gallery')}
                  >
                    <span className="send-option__icon">
                      <GalleryIcon />
                    </span>
                    <span className="send-option__text">
                      <strong>Galeria</strong>
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="send-option"
                    onClick={() => openSource('camera')}
                  >
                    <span className="send-option__icon">
                      <CameraIcon />
                    </span>
                    <span className="send-option__text">
                      <strong>Câmera</strong>
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="send-option"
                    onClick={() => openSource('files')}
                  >
                    <span className="send-option__icon">
                      <FolderIcon />
                    </span>
                    <span className="send-option__text">
                      <strong>Arquivos</strong>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </li>
        )}
        {photos.map((photo) => {
          const available = photoIsAvailable(photo)
          const src = urls[photo.id]
          return (
            <li key={photo.id} className="quote-photos__item">
              {available && src ? (
                <button
                  type="button"
                  className="quote-photos__thumb"
                  onClick={() => openViewer(photo.id)}
                >
                  <img src={src} alt="" />
                </button>
              ) : (
                <span className="quote-photos__expired muted">Expirada</span>
              )}
              {canEdit && (
                <IconButton
                  label="Remover foto"
                  size="sm"
                  tone="danger"
                  className="quote-photos__remove"
                  disabled={busy || uploading}
                  onClick={(e) => {
                    e.stopPropagation()
                    void onRemove(photo)
                  }}
                >
                  <TrashIcon />
                </IconButton>
              )}
            </li>
          )
        })}
      </ul>
      {canEdit && (
        <>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            hidden
            onChange={(e) => void onPickFiles(e.target.files)}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            capture="environment"
            hidden
            onChange={(e) => void onPickFiles(e.target.files)}
          />
          {/* No accept: on Android this tends to open Documents/Files, not Google Photos.
              Non-images are rejected in fileToQuotePhotoBlob. */}
          <input
            ref={filesInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => void onPickFiles(e.target.files)}
          />
        </>
      )}
      {canEdit && atMax && (
        <p className="btn-reason">Máximo de {QUOTE_PHOTOS_MAX} fotos neste orçamento.</p>
      )}

      {viewerPhoto && viewerSrc && viewerIndex !== null && (
        <Modal
          className="modal--photo"
          title={`Foto ${viewerIndex + 1} de ${viewable.length}`}
          onClose={() => setViewerIndex(null)}
        >
          <PhotoViewer
            src={viewerSrc}
            canNav={viewable.length > 1}
            onPrev={() => stepViewer(-1)}
            onNext={() => stepViewer(1)}
          />
        </Modal>
      )}
    </CollapsibleSection>
  )
}

function PhotoViewer({
  src,
  canNav,
  onPrev,
  onNext,
}: {
  src: string
  canNav: boolean
  onPrev: () => void
  onNext: () => void
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const scaleRef = useRef(1)
  const panRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    origX: number
    origY: number
    moved: boolean
  } | null>(null)
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null)
  const swipeRef = useRef<number | null>(null)
  const lastTapRef = useRef(0)

  useEffect(() => {
    setScale(1)
    setTx(0)
    setTy(0)
    scaleRef.current = 1
  }, [src])

  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  const clampScale = (value: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value))

  const setZoom = (next: number, around?: { x: number; y: number }) => {
    const prev = scaleRef.current
    const clamped = clampScale(next)
    if (clamped === prev) return
    if (clamped === ZOOM_MIN) {
      setScale(ZOOM_MIN)
      setTx(0)
      setTy(0)
      return
    }
    const stage = stageRef.current?.getBoundingClientRect()
    const cx = around?.x ?? (stage ? stage.left + stage.width / 2 : 0)
    const cy = around?.y ?? (stage ? stage.top + stage.height / 2 : 0)
    const originX = stage ? stage.left + stage.width / 2 : 0
    const originY = stage ? stage.top + stage.height / 2 : 0
    setTx((ox) => ox + (cx - originX - ox) * (1 - clamped / prev))
    setTy((oy) => oy + (cy - originY - oy) * (1 - clamped / prev))
    setScale(clamped)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        setZoom(scaleRef.current * 1.25)
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        setZoom(scaleRef.current / 1.25)
      } else if (e.key === '0') {
        e.preventDefault()
        setZoom(ZOOM_MIN)
      } else if (e.key === 'ArrowLeft' && canNav && scaleRef.current <= ZOOM_MIN) {
        e.preventDefault()
        onPrev()
      } else if (e.key === 'ArrowRight' && canNav && scaleRef.current <= ZOOM_MIN) {
        e.preventDefault()
        onNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canNav, onPrev, onNext])

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    setZoom(scaleRef.current * factor, { x: e.clientX, y: e.clientY })
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === 'touch') return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    if (scaleRef.current > ZOOM_MIN) {
      panRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origX: tx,
        origY: ty,
        moved: false,
      }
    } else {
      swipeRef.current = e.clientX
    }
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    const pan = panRef.current
    if (pan && pan.pointerId === e.pointerId) {
      const dx = e.clientX - pan.startX
      const dy = e.clientY - pan.startY
      if (Math.abs(dx) + Math.abs(dy) > 3) pan.moved = true
      setTx(pan.origX + dx)
      setTy(pan.origY + dy)
    }
  }

  const onPointerUp = (e: ReactPointerEvent) => {
    const pan = panRef.current
    if (pan && pan.pointerId === e.pointerId) {
      panRef.current = null
      if (!pan.moved) {
        const now = Date.now()
        if (now - lastTapRef.current < 320) {
          setZoom(ZOOM_MIN)
          lastTapRef.current = 0
        } else {
          lastTapRef.current = now
        }
      }
      return
    }
    if (swipeRef.current != null && scaleRef.current <= ZOOM_MIN && canNav) {
      const dx = e.clientX - swipeRef.current
      swipeRef.current = null
      if (Math.abs(dx) >= 48) {
        if (dx < 0) onNext()
        else onPrev()
        return
      }
    }
    swipeRef.current = null
    const now = Date.now()
    if (now - lastTapRef.current < 320) {
      setZoom(scaleRef.current > ZOOM_MIN ? ZOOM_MIN : 2.2, { x: e.clientX, y: e.clientY })
      lastTapRef.current = 0
    } else {
      lastTapRef.current = now
    }
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      pinchRef.current = { dist, scale: scaleRef.current }
      swipeRef.current = null
      panRef.current = null
      return
    }
    if (e.touches.length === 1) {
      if (scaleRef.current > ZOOM_MIN) {
        panRef.current = {
          pointerId: -1,
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          origX: tx,
          origY: ty,
          moved: false,
        }
      } else {
        swipeRef.current = e.touches[0].clientX
      }
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault()
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      setZoom(pinchRef.current.scale * (dist / pinchRef.current.dist), { x: midX, y: midY })
      return
    }
    const pan = panRef.current
    if (pan && e.touches.length === 1 && scaleRef.current > ZOOM_MIN) {
      e.preventDefault()
      const dx = e.touches[0].clientX - pan.startX
      const dy = e.touches[0].clientY - pan.startY
      if (Math.abs(dx) + Math.abs(dy) > 3) pan.moved = true
      setTx(pan.origX + dx)
      setTy(pan.origY + dy)
    }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null
    if (e.touches.length === 0) {
      const pan = panRef.current
      panRef.current = null
      if (swipeRef.current != null && scaleRef.current <= ZOOM_MIN && canNav) {
        const endX = e.changedTouches[0]?.clientX
        if (endX != null) {
          const dx = endX - swipeRef.current
          if (Math.abs(dx) >= 48) {
            if (dx < 0) onNext()
            else onPrev()
            swipeRef.current = null
            return
          }
        }
      }
      swipeRef.current = null
      if (pan && !pan.moved) {
        const now = Date.now()
        const touch = e.changedTouches[0]
        if (now - lastTapRef.current < 320 && touch) {
          setZoom(scaleRef.current > ZOOM_MIN ? ZOOM_MIN : 2.2, {
            x: touch.clientX,
            y: touch.clientY,
          })
          lastTapRef.current = 0
        } else {
          lastTapRef.current = now
        }
      }
    }
  }

  const zoomed = scale > ZOOM_MIN + 0.01

  return (
    <div className="photo-viewer">
      <div
        ref={stageRef}
        className={`photo-viewer__stage${zoomed ? ' photo-viewer__stage--zoomed' : ''}`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {canNav && !zoomed && (
          <button
            type="button"
            className="photo-viewer__nav photo-viewer__nav--prev"
            aria-label="Foto anterior"
            onClick={onPrev}
          >
            <ChevronIcon dir="left" />
          </button>
        )}
        <img
          className="photo-viewer__img"
          src={src}
          alt=""
          draggable={false}
          style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }}
        />
        {canNav && !zoomed && (
          <button
            type="button"
            className="photo-viewer__nav photo-viewer__nav--next"
            aria-label="Próxima foto"
            onClick={onNext}
          >
            <ChevronIcon dir="right" />
          </button>
        )}
      </div>
      <div className="photo-viewer__zoom">
        <button
          type="button"
          className="photo-viewer__zoom-btn"
          aria-label="Diminuir zoom"
          disabled={scale <= ZOOM_MIN}
          onClick={() => setZoom(scale / 1.35)}
        >
          −
        </button>
        <button
          type="button"
          className="photo-viewer__zoom-btn"
          aria-label="Resetar zoom"
          disabled={!zoomed}
          onClick={() => setZoom(ZOOM_MIN)}
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          type="button"
          className="photo-viewer__zoom-btn"
          aria-label="Aumentar zoom"
          disabled={scale >= ZOOM_MAX}
          onClick={() => setZoom(scale * 1.35)}
        >
          +
        </button>
      </div>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function GalleryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.5 6.5h15v12h-15zM4.5 15.5l4-4 3 3 2.5-2.5 5.5 5.5M9 10.2a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.5 8.5h3l1.5-2h6l1.5 2h3v10h-15zM12 16.2a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3.5 7.5h6l1.5 1.5h9.5v9.5h-17z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 6.5h16M9.5 6.5V4.8c0-.7.6-1.3 1.3-1.3h2.4c.7 0 1.3.6 1.3 1.3v1.7M6.2 6.5l.8 12.3c.1 1 .9 1.7 1.9 1.7h6.2c1 0 1.8-.7 1.9-1.7l.8-12.3M10 10.5v6M14 10.5v6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
  const d = dir === 'left' ? 'M14.5 6.5 9 12l5.5 5.5' : 'M9.5 6.5 15 12l-5.5 5.5'
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

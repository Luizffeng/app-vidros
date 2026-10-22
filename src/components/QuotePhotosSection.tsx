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
import { motionMs, usePresence } from './usePresence'

const ZOOM_MIN = 1
const ZOOM_MAX = 5
const SWIPE_PX = 48

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
  const listRef = useRef<HTMLUListElement>(null)
  const addWrapRef = useRef<HTMLDivElement>(null)
  const addBtnRef = useRef<HTMLButtonElement>(null)
  const firstOptRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [scrollToId, setScrollToId] = useState<string | null>(null)
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

  // New thumbs land at the end of the grid. Scroll until the whole Fotos
  // section clears the sticky action bar (nearest on the thumb was not enough).
  useEffect(() => {
    if (!scrollToId) return
    if (!photos.some((p) => p.id === scrollToId)) return
    const list = listRef.current
    if (!list) return

    const revealEnd = () => {
      const section =
        (list.closest('.collapsible-section') as HTMLElement | null) ?? list
      const bar = document.querySelector<HTMLElement>('.action-bar')
      const footPad = (bar?.getBoundingClientRect().height ?? 72) + 16
      const overflow = section.getBoundingClientRect().bottom - (window.innerHeight - footPad)
      if (overflow > 1) window.scrollBy({ top: overflow, left: 0, behavior: 'smooth' })
    }

    let timeout = 0
    const raf = window.requestAnimationFrame(() => {
      revealEnd()
      // Second pass after the new thumb/image has laid out.
      timeout = window.setTimeout(() => {
        revealEnd()
        setScrollToId(null)
      }, 200)
    })
    return () => {
      window.cancelAnimationFrame(raf)
      window.clearTimeout(timeout)
    }
  }, [scrollToId, photos, urls])

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
      if (next !== photos) {
        const lastId = next[next.length - 1]?.id
        await onChange(next)
        if (lastId) setScrollToId(lastId)
      }
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

  return (
    <CollapsibleSection
      title="Fotos"
      count={`${photos.length}/${QUOTE_PHOTOS_MAX}`}
      defaultOpen={photos.length > 0}
    >
      <p className="section-hint">Adicione fotos da obra, projetos, medidas ou anotações.</p>
      {error && <Banner tone="error">{error}</Banner>}
      <ul className="quote-photos" ref={listRef}>
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
            <li key={photo.id} className="quote-photos__item" data-photo-id={photo.id}>
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

      {viewerIndex !== null && viewable.length > 0 && (
        <Modal
          className="modal--photo"
          title={`Foto ${viewerIndex + 1} de ${viewable.length}`}
          onClose={() => setViewerIndex(null)}
        >
          <PhotoViewer
            slides={viewable.map((p) => ({ id: p.id, src: urls[p.id]! }))}
            index={viewerIndex}
            onIndexChange={setViewerIndex}
          />
        </Modal>
      )}
    </CollapsibleSection>
  )
}

const DOUBLE_MS = 420
const DOUBLE_ZOOM = 2.4
/** Max finger/pointer drift still counted as a tap (not a swipe). */
const TAP_SLOP = 28
/** Second tap must land near the first. */
const TAP_DIST = 48
/** Ignore mouse/pointer ghosts after a real touch. */
const TOUCH_GUARD_MS = 700
/** Ignore a second zoom toggle from a duplicate event. */
const ZOOM_TOGGLE_LOCK_MS = 450
const PAN_MOVE_PX = 10
/** Max empty pixels past an image edge while panning (stay in the frame). */
const PAN_EDGE_SLACK = 1

function PhotoViewer({
  slides,
  index,
  onIndexChange,
}: {
  slides: { id: string; src: string }[]
  index: number
  onIndexChange: (index: number) => void
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [settle, setSettle] = useState(false)
  const [stageW, setStageW] = useState(0)
  /** Local index so slide settle + reset don't flash before parent re-renders. */
  const [visualIndex, setVisualIndex] = useState(index)
  const scaleRef = useRef(1)
  const txRef = useRef(0)
  const tyRef = useRef(0)
  const settlingRef = useRef(false)
  const visualIndexRef = useRef(index)
  const panRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    origX: number
    origY: number
    moved: boolean
  } | null>(null)
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null)
  const swipeRef = useRef<{ x: number; y: number } | null>(null)
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null)
  const lastTouchAtRef = useRef(0)
  const zoomLockRef = useRef(0)
  const capturePtrRef = useRef<number | null>(null)
  const canNav = slides.length > 1
  const currentSrc = slides[visualIndex]?.src

  useEffect(() => {
    if (!settlingRef.current) {
      setVisualIndex(index)
      visualIndexRef.current = index
    }
  }, [index])

  useEffect(() => {
    setScale(1)
    setTx(0)
    setTy(0)
    scaleRef.current = 1
    txRef.current = 0
    tyRef.current = 0
    lastTapRef.current = null
  }, [currentSrc])

  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  const clampPan = (nextTx: number, nextTy: number, s: number) => {
    if (s <= ZOOM_MIN) return { tx: 0, ty: 0 }
    const stage = stageRef.current
    const img = imgRef.current
    if (!stage || !img) return { tx: nextTx, ty: nextTy }
    const stageWpx = stage.clientWidth
    const stageHpx = stage.clientHeight
    const scaledW = img.offsetWidth * s
    const scaledH = img.offsetHeight * s
    // Origin center: pan until the far edge leaves at most PAN_EDGE_SLACK empty.
    const maxX = scaledW > stageWpx ? (scaledW - stageWpx) / 2 + PAN_EDGE_SLACK : 0
    const maxY = scaledH > stageHpx ? (scaledH - stageHpx) / 2 + PAN_EDGE_SLACK : 0
    return {
      tx: Math.min(maxX, Math.max(-maxX, nextTx)),
      ty: Math.min(maxY, Math.max(-maxY, nextTy)),
    }
  }

  const applyPan = (nextTx: number, nextTy: number, s = scaleRef.current) => {
    const c = clampPan(nextTx, nextTy, s)
    txRef.current = c.tx
    tyRef.current = c.ty
    setTx(c.tx)
    setTy(c.ty)
  }

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const update = () => {
      setStageW(el.offsetWidth)
      if (scaleRef.current > ZOOM_MIN) {
        applyPan(txRef.current, tyRef.current, scaleRef.current)
      }
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const width = stageW || stageRef.current?.offsetWidth || 0

  const clampScale = (value: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value))

  const setZoom = (next: number, around?: { x: number; y: number }) => {
    const prev = scaleRef.current
    const clamped = clampScale(next)
    if (clamped === ZOOM_MIN) {
      setScale(ZOOM_MIN)
      scaleRef.current = ZOOM_MIN
      applyPan(0, 0, ZOOM_MIN)
      return
    }
    if (clamped === prev) return
    const stage = stageRef.current?.getBoundingClientRect()
    const cx = around?.x ?? (stage ? stage.left + stage.width / 2 : 0)
    const cy = around?.y ?? (stage ? stage.top + stage.height / 2 : 0)
    const originX = stage ? stage.left + stage.width / 2 : 0
    const originY = stage ? stage.top + stage.height / 2 : 0
    const ox = txRef.current
    const oy = tyRef.current
    const nextTx = ox + (cx - originX - ox) * (1 - clamped / prev)
    const nextTy = oy + (cy - originY - oy) * (1 - clamped / prev)
    setScale(clamped)
    scaleRef.current = clamped
    applyPan(nextTx, nextTy, clamped)
  }

  const toggleDoubleZoom = (around?: { x: number; y: number }) => {
    const now = Date.now()
    if (now - zoomLockRef.current < ZOOM_TOGGLE_LOCK_MS) return
    zoomLockRef.current = now
    if (scaleRef.current > ZOOM_MIN) setZoom(ZOOM_MIN)
    else setZoom(DOUBLE_ZOOM, around)
  }

  const onDoubleActivate = (clientX: number, clientY: number) => {
    const now = Date.now()
    const prev = lastTapRef.current
    if (
      prev &&
      now - prev.t < DOUBLE_MS &&
      Math.hypot(clientX - prev.x, clientY - prev.y) < TAP_DIST
    ) {
      toggleDoubleZoom({ x: clientX, y: clientY })
      lastTapRef.current = null
    } else {
      lastTapRef.current = { t: now, x: clientX, y: clientY }
    }
  }

  const markTouch = () => {
    lastTouchAtRef.current = Date.now()
  }

  const isGhostPointer = (pointerType: string) =>
    pointerType !== 'touch' && Date.now() - lastTouchAtRef.current < TOUCH_GUARD_MS

  const snapBack = () => {
    settlingRef.current = true
    setSettle(true)
    setDragX(0)
    window.setTimeout(() => {
      setSettle(false)
      settlingRef.current = false
    }, motionMs('md'))
  }

  const goBy = (dir: -1 | 1) => {
    if (!canNav || settlingRef.current || scaleRef.current > ZOOM_MIN) return
    const from = visualIndexRef.current
    const next = from + dir
    if (next < 0 || next >= slides.length) {
      snapBack()
      return
    }
    const w = width || stageRef.current?.offsetWidth || 320
    settlingRef.current = true
    setSettle(true)
    setDragX(-dir * w)
    window.setTimeout(() => {
      // Drop transition before swapping index/offset so the track does not flash.
      setSettle(false)
      setDragX(0)
      setVisualIndex(next)
      visualIndexRef.current = next
      onIndexChange(next)
      settlingRef.current = false
      setScale(ZOOM_MIN)
      scaleRef.current = ZOOM_MIN
      applyPan(0, 0, ZOOM_MIN)
      lastTapRef.current = null
    }, motionMs('md'))
  }

  const endSwipe = (dx: number, clientX: number, clientY: number) => {
    if (settlingRef.current) return
    if (canNav && scaleRef.current <= ZOOM_MIN && Math.abs(dx) >= SWIPE_PX) {
      goBy(dx < 0 ? 1 : -1)
      return
    }
    if (Math.abs(dx) < TAP_SLOP) {
      setDragX(0)
      onDoubleActivate(clientX, clientY)
      return
    }
    snapBack()
  }

  const ensureCapture = (el: HTMLElement, pointerId: number) => {
    if (capturePtrRef.current === pointerId) return
    try {
      el.setPointerCapture(pointerId)
      capturePtrRef.current = pointerId
    } catch {
      /* already released */
    }
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
        goBy(-1)
      } else if (e.key === 'ArrowRight' && canNav && scaleRef.current <= ZOOM_MIN) {
        e.preventDefault()
        goBy(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    setZoom(scaleRef.current * factor, { x: e.clientX, y: e.clientY })
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    // Touch path uses TouchEvents. Skip real touch + synthetic mouse after touch.
    if (e.pointerType === 'touch' || isGhostPointer(e.pointerType) || settlingRef.current) return
    // Capture only after drag — early capture breaks double-click timing on desktop.
    if (scaleRef.current > ZOOM_MIN) {
      panRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origX: txRef.current,
        origY: tyRef.current,
        moved: false,
      }
    } else {
      setSettle(false)
      swipeRef.current = { x: e.clientX, y: e.clientY }
    }
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    if (e.pointerType === 'touch' || isGhostPointer(e.pointerType)) return
    const pan = panRef.current
    if (pan && pan.pointerId === e.pointerId) {
      const dx = e.clientX - pan.startX
      const dy = e.clientY - pan.startY
      if (Math.abs(dx) + Math.abs(dy) > PAN_MOVE_PX) {
        pan.moved = true
        ensureCapture(e.currentTarget as HTMLElement, e.pointerId)
      }
      applyPan(pan.origX + dx, pan.origY + dy)
      return
    }
    if (swipeRef.current != null && scaleRef.current <= ZOOM_MIN) {
      let dx = e.clientX - swipeRef.current.x
      if (Math.abs(dx) > PAN_MOVE_PX || Math.abs(e.clientY - swipeRef.current.y) > PAN_MOVE_PX) {
        ensureCapture(e.currentTarget as HTMLElement, e.pointerId)
      }
      const i = visualIndexRef.current
      if ((i === 0 && dx > 0) || (i === slides.length - 1 && dx < 0)) dx *= 0.35
      setDragX(dx)
    }
  }

  const onPointerUp = (e: ReactPointerEvent) => {
    if (e.pointerType === 'touch' || isGhostPointer(e.pointerType)) return
    capturePtrRef.current = null
    const pan = panRef.current
    if (pan && pan.pointerId === e.pointerId) {
      panRef.current = null
      if (!pan.moved) onDoubleActivate(e.clientX, e.clientY)
      return
    }
    if (swipeRef.current != null && scaleRef.current <= ZOOM_MIN) {
      const dx = e.clientX - swipeRef.current.x
      swipeRef.current = null
      endSwipe(dx, e.clientX, e.clientY)
      return
    }
    swipeRef.current = null
  }

  const onTouchStart = (e: React.TouchEvent) => {
    markTouch()
    if (settlingRef.current) return
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      pinchRef.current = { dist, scale: scaleRef.current }
      swipeRef.current = null
      panRef.current = null
      setDragX(0)
      return
    }
    if (e.touches.length === 1) {
      if (scaleRef.current > ZOOM_MIN) {
        panRef.current = {
          pointerId: -1,
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          origX: txRef.current,
          origY: tyRef.current,
          moved: false,
        }
      } else {
        setSettle(false)
        swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    markTouch()
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
      if (Math.abs(dx) + Math.abs(dy) > PAN_MOVE_PX) pan.moved = true
      applyPan(pan.origX + dx, pan.origY + dy)
      return
    }
    if (swipeRef.current != null && e.touches.length === 1 && scaleRef.current <= ZOOM_MIN) {
      let dx = e.touches[0].clientX - swipeRef.current.x
      const i = visualIndexRef.current
      if ((i === 0 && dx > 0) || (i === slides.length - 1 && dx < 0)) dx *= 0.35
      setDragX(dx)
    }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    markTouch()
    if (e.touches.length < 2) pinchRef.current = null
    if (e.touches.length !== 0) return
    const pan = panRef.current
    panRef.current = null
    const touch = e.changedTouches[0]
    if (swipeRef.current != null && scaleRef.current <= ZOOM_MIN) {
      const start = swipeRef.current
      swipeRef.current = null
      if (touch) endSwipe(touch.clientX - start.x, touch.clientX, touch.clientY)
      return
    }
    swipeRef.current = null
    if (pan && !pan.moved && touch) onDoubleActivate(touch.clientX, touch.clientY)
  }

  const zoomed = scale > ZOOM_MIN + 0.01
  const trackX = width > 0 ? -visualIndex * width + dragX : 0

  return (
    <div className="photo-viewer">
      <div className="photo-viewer__frame">
        {canNav && !zoomed && (
          <button
            type="button"
            className="photo-viewer__nav photo-viewer__nav--prev"
            aria-label="Foto anterior"
            disabled={settle || visualIndex <= 0}
            onClick={() => goBy(-1)}
          >
            <ChevronIcon dir="left" />
          </button>
        )}
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
          <div
            className={`photo-viewer__track${settle ? ' photo-viewer__track--settle' : ''}`}
            style={{ transform: `translate3d(${trackX}px, 0, 0)` }}
          >
            {slides.map((slide, i) => (
              <div key={slide.id} className="photo-viewer__slide">
                <img
                  ref={i === visualIndex ? imgRef : undefined}
                  className="photo-viewer__img"
                  src={slide.src}
                  alt=""
                  draggable={false}
                  style={
                    i === visualIndex
                      ? { transform: `translate(${tx}px, ${ty}px) scale(${scale})` }
                      : undefined
                  }
                />
              </div>
            ))}
          </div>
        </div>
        {canNav && !zoomed && (
          <button
            type="button"
            className="photo-viewer__nav photo-viewer__nav--next"
            aria-label="Próxima foto"
            disabled={settle || visualIndex >= slides.length - 1}
            onClick={() => goBy(1)}
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

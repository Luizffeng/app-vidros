import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist/legacy/build/pdf.mjs'
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

type PdfJs = typeof import('pdfjs-dist/legacy/build/pdf.mjs')

/** Build legacy: o iOS/Safari mais antigo não tem as APIs JS mais novas usadas pelo build moderno. */
let pdfjsPromise: Promise<PdfJs> | null = null

function loadPdfJs(): Promise<PdfJs> {
  pdfjsPromise ??= import('pdfjs-dist/legacy/build/pdf.mjs')
    .then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
      return pdfjs
    })
    .catch((e: unknown) => {
      pdfjsPromise = null
      throw e
    })
  return pdfjsPromise
}

/** Limite de pixels por canvas (iOS recusa canvas muito grandes). */
const MAX_CANVAS_PIXELS = 8_000_000
const RESIZE_DEBOUNCE_MS = 150

export function PdfPreview({ data }: { data: Blob | ArrayBuffer }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [width, setWidth] = useState(0)
  const [rendered, setRendered] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    setWidth(Math.floor(el.clientWidth))
    if (typeof ResizeObserver === 'undefined') return
    let timer: number | undefined
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        setWidth(Math.floor(el.clientWidth))
      }, RESIZE_DEBOUNCE_MS)
    })
    observer.observe(el)
    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let loadingTask: ReturnType<PdfJs['getDocument']> | null = null
    setDoc(null)
    setRendered(false)
    setError(null)

    void (async () => {
      try {
        const [pdfjs, bytes] = await Promise.all([
          loadPdfJs(),
          data instanceof Blob ? data.arrayBuffer() : Promise.resolve(data.slice(0)),
        ])
        if (cancelled) return
        loadingTask = pdfjs.getDocument({ data: new Uint8Array(bytes) })
        const loaded = await loadingTask.promise
        if (cancelled) return
        setDoc(loaded)
      } catch (e) {
        if (cancelled) return
        console.error(e)
        setError('Não foi possível carregar a prévia do PDF.')
      }
    })()

    return () => {
      cancelled = true
      void loadingTask?.destroy()
    }
  }, [data])

  useEffect(() => {
    if (!doc || width <= 0) return
    let cancelled = false
    const tasks: RenderTask[] = []

    void (async () => {
      try {
        const dpr = Math.min(window.devicePixelRatio || 1, 3)
        for (let i = 1; i <= doc.numPages; i += 1) {
          const page = await doc.getPage(i)
          if (cancelled) return
          const canvas = canvasRefs.current[i - 1]
          if (!canvas) continue
          const base = page.getViewport({ scale: 1 })
          const cssScale = width / base.width
          const maxScale = Math.sqrt(MAX_CANVAS_PIXELS / (base.width * base.height))
          const viewport = page.getViewport({ scale: Math.min(cssScale * dpr, maxScale) })
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          const task = page.render({ canvas, viewport, background: '#ffffff' })
          tasks.push(task)
          await task.promise
          if (cancelled) return
        }
        setRendered(true)
      } catch (e) {
        if (cancelled || (e instanceof Error && e.name === 'RenderingCancelledException')) return
        console.error(e)
        setError('Não foi possível desenhar a prévia do PDF.')
      }
    })()

    return () => {
      cancelled = true
      for (const task of tasks) task.cancel()
    }
  }, [doc, width])

  const pageCount = doc?.numPages ?? 0

  return (
    <div className="pdf-preview" aria-label="Prévia do orçamento" aria-busy={!rendered && !error}>
      {error ? (
        <p className="pdf-preview__status pdf-preview__status--error" role="alert">
          {error} Use “Baixar” para abrir o arquivo.
        </p>
      ) : (
        !rendered && <p className="pdf-preview__status">Carregando prévia…</p>
      )}
      <div
        ref={containerRef}
        className={rendered && !error ? 'pdf-preview__pages' : 'pdf-preview__pages pdf-preview__pages--hidden'}
      >
        {Array.from({ length: pageCount }, (_, idx) => (
          <canvas
            key={idx}
            ref={(el) => {
              canvasRefs.current[idx] = el
            }}
            className="pdf-preview__page"
            role="img"
            aria-label={`Página ${idx + 1} de ${pageCount}`}
          />
        ))}
      </div>
    </div>
  )
}

const ACCEPT = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const MAX_INPUT_BYTES = 8 * 1024 * 1024
const MAX_EDGE_PX = 1280
const MAX_OUT_BYTES = 2 * 1024 * 1024
const JPEG_QUALITY = 0.72

export function isAcceptedQuotePhotoType(type: string): boolean {
  return ACCEPT.includes(type.toLowerCase())
}

/** Compress for quote evidence: JPEG, ~1280px edge, quality 0.72, hard max 2 MB. */
export async function fileToQuotePhotoBlob(file: File): Promise<Blob> {
  if (!isAcceptedQuotePhotoType(file.type)) {
    throw new Error('Use PNG, JPEG ou WebP.')
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Arquivo muito grande (máx. 8 MB).')
  }

  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Não foi possível processar a imagem.')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(bitmap, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY),
    )
    if (!blob) throw new Error('Não foi possível processar a imagem.')
    if (blob.size > MAX_OUT_BYTES) {
      throw new Error('Imagem ainda grande demais após comprimir (máx. 2 MB).')
    }
    return blob
  } finally {
    bitmap.close()
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Falha ao ler a imagem.'))
    }
    reader.onerror = () => reject(new Error('Falha ao ler a imagem.'))
    reader.readAsDataURL(blob)
  })
}

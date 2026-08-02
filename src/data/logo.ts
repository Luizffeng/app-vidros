const MAX_INPUT_BYTES = 5 * 1024 * 1024
const MAX_EDGE_PX = 720
const ACCEPT = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

export function isAcceptedLogoType(type: string): boolean {
  return ACCEPT.includes(type.toLowerCase())
}

/** Redimensiona e devolve data URL PNG (bom pra logo com fundo transparente) */
export async function fileToLogoDataUrl(file: File): Promise<string> {
  if (!isAcceptedLogoType(file.type)) {
    throw new Error('Use PNG, JPEG ou WebP.')
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Arquivo muito grande (máx. 5 MB).')
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
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(bitmap, 0, 0, w, h)
    return canvas.toDataURL('image/png')
  } finally {
    bitmap.close()
  }
}

export function logoFormatForPdf(dataUrl: string): 'PNG' | 'JPEG' {
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
    return 'JPEG'
  }
  return 'PNG'
}

export function loadImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Logo inválida.'))
    img.src = dataUrl
  })
}

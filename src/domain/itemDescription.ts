import type { CorrerSubtype, ItemInput } from './types'

/** Descrição do item em três linhas: tipo, cor/espessura e medida. */
export interface ItemDescription {
  title: string
  spec?: string
  size?: string
}

const CORRER_TITLES: Record<CorrerSubtype, string> = {
  J2F: 'Janela de correr 2 folhas',
  J4F: 'Janela de correr 4 folhas',
  P2F: 'Porta de correr 2 folhas',
  P4F: 'Porta de correr 4 folhas',
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function thickness(value: unknown): string {
  const raw = clean(value).replace(/\s*mm$/i, '')
  return raw ? `${raw}mm` : ''
}

function joinWords(...parts: string[]): string | undefined {
  const text = parts.filter(Boolean).join(' ')
  return text || undefined
}

function glassSpec(color: unknown, thicknessMm?: unknown): string | undefined {
  const c = clean(color)
  const t = thickness(thicknessMm)
  return c || t ? joinWords('Vidro', c, t) : undefined
}

function framedSpec(
  profileColor: unknown,
  glassColor: unknown,
  thicknessMm?: unknown,
): string | undefined {
  const aluminum = clean(profileColor) ? `Alumínio ${clean(profileColor)}` : ''
  const glass = glassSpec(glassColor, thicknessMm) ?? ''
  const text = [aluminum, glass].filter(Boolean).join(' · ')
  return text || undefined
}

function sizeMm(widthMm: unknown, heightMm: unknown): string | undefined {
  const w = Number(widthMm)
  const h = Number(heightMm)
  if (!(w > 0) || !(h > 0)) return undefined
  return `${w} × ${h} mm`
}

export function describeItem(input: ItemInput): ItemDescription {
  switch (input.kind) {
    case 'espelho':
      return {
        title: clean(input.finish) || 'Espelho',
        spec: joinWords(clean(input.glassColor), thickness(input.thicknessMm)),
        size: sizeMm(input.widthMm, input.heightMm),
      }
    case 'fixo':
      return {
        title: 'Vidro fixo temperado',
        spec: glassSpec(input.glassColor, input.thicknessMm),
        size: sizeMm(input.widthMm, input.heightMm),
      }
    case 'correr':
      return {
        title: CORRER_TITLES[input.subtype] ?? 'Esquadria de correr',
        spec: framedSpec(input.profileColor, input.glassColor, input.thicknessMm),
        size: sizeMm(input.widthMm, input.heightMm),
      }
    case 'pivotante':
      return {
        title: input.hasLatch ? 'Porta pivotante com trinco' : 'Porta pivotante',
        spec: framedSpec(input.profileColor, input.glassColor, input.thicknessMm),
        size: sizeMm(input.widthMm, input.heightMm),
      }
    case 'maxiar':
      return {
        title: 'Janela maxim-ar',
        spec: framedSpec(input.profileColor, input.glassColor, input.thicknessMm),
        size: sizeMm(input.widthMm, input.heightMm),
      }
    case 'box':
      return {
        title: 'Box frontal 2 folhas',
        spec: framedSpec(input.profileColor, input.glassColor),
        size: Number(input.spanCm) > 0 ? `Vão ${input.spanCm} cm` : undefined,
      }
    case 'custom':
      return { title: clean(input.description) || 'Item avulso' }
  }
}

export function itemNote(input: ItemInput): string | undefined {
  return clean(input.note) || undefined
}

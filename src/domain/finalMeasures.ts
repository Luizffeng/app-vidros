import type { FinalMeasure, ItemInput } from './types'

function field(key: string, label: string, value: string | number, unit?: string): FinalMeasure {
  return { key, label, value: String(value), ...(unit ? { unit } : {}) }
}

/** Template + seed from quote input. Used when `finalMeasures` was never saved. */
export function seedFinalMeasures(input: ItemInput): FinalMeasure[] {
  switch (input.kind) {
    case 'box':
      return [field('spanCm', 'Largura', input.spanCm, 'cm')]
    case 'correr':
    case 'pivotante':
    case 'maxiar':
    case 'fixo':
    case 'espelho':
      return [
        field('widthMm', 'Largura', input.widthMm, 'mm'),
        field('heightMm', 'Altura', input.heightMm, 'mm'),
      ]
    case 'custom':
      return [
        field('widthMm', 'Largura', '', 'mm'),
        field('heightMm', 'Altura', '', 'mm'),
        field('a', 'Medida A', ''),
        field('b', 'Medida B', ''),
        field('c', 'Medida C', ''),
        field('d', 'Medida D', ''),
      ]
  }
}

export function normalizeFinalMeasures(raw: unknown): FinalMeasure[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: FinalMeasure[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    if (typeof r.key !== 'string' || typeof r.label !== 'string' || typeof r.value !== 'string') continue
    out.push({
      key: r.key,
      label: r.label,
      value: r.value.trim(),
      ...(typeof r.unit === 'string' && r.unit ? { unit: r.unit } : {}),
    })
  }
  return out
}

export function sameFinalMeasures(a: FinalMeasure[], b: FinalMeasure[]): boolean {
  if (a.length !== b.length) return false
  return a.every((row, i) => {
    const o = b[i]
    return row.key === o.key && row.label === o.label && row.value === o.value && row.unit === o.unit
  })
}

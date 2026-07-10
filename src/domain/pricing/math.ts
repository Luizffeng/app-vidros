import type { Catalog, PricingConfig } from '../types'

/** Excel-compatible CEILING(number, significance) */
export function ceiling(value: number, significance: number): number {
  if (significance === 0) return value
  return Math.ceil(value / significance - 1e-12) * significance
}

export function roundUp(value: number, digits: number): number {
  const f = 10 ** digits
  return Math.ceil(value * f - 1e-12) / f
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function aluminumSurcharge(config: PricingConfig, color: string): number {
  const found = config.aluminumColors.find((c) => c.color === color)
  if (!found) throw new Error(`Cor de alumínio desconhecida: ${color}`)
  return found.surcharge
}

export function findVidro(
  catalog: Catalog,
  tipo: string,
  cor: string,
  espessuraMm?: string | null,
) {
  const match = catalog.vidros.find(
    (v) =>
      v.tipo === tipo &&
      v.cor === cor &&
      (espessuraMm == null || v.espessuraMm === espessuraMm),
  )
  if (!match || match.valorM2 == null) {
    throw new Error(
      `Vidro sem preço: ${tipo} / ${cor}${espessuraMm ? ` / ${espessuraMm}mm` : ''}`,
    )
  }
  return match
}

export function findAcessorio(catalog: Catalog, codigo: string) {
  const match = catalog.acessorios.find((a) => a.codigo === codigo)
  if (!match) throw new Error(`Acessório não encontrado: ${codigo}`)
  return match
}

export function findAluminio(catalog: Catalog, codigo: string) {
  const match = catalog.aluminios.find((a) => a.codigo === codigo)
  if (!match) throw new Error(`Alumínio não encontrado: ${codigo}`)
  return match
}

export function nearestKitSize(sizes: number[], spanCm: number): number {
  const sorted = [...sizes].sort((a, b) => a - b)
  const found = sorted.find((s) => s >= spanCm)
  if (found == null) return sorted[sorted.length - 1]
  return found
}

export function findKitBox(catalog: Catalog, cor: string, tamanhoCm: number) {
  const match = catalog.kitBox.find(
    (k) => k.cor === cor && k.tamanhoCm === tamanhoCm,
  )
  if (!match || match.valor == null) {
    throw new Error(`Kit Box sem preço: ${cor} / ${tamanhoCm}cm`)
  }
  return match
}

export function buildBreakdown(parts: {
  labor: number
  glass: number
  aluminum: number
  hardware: number
  accessories: number
  extras: number
  markup: number
}) {
  const totalCost =
    parts.labor +
    parts.glass +
    parts.aluminum +
    parts.hardware +
    parts.accessories +
    parts.extras
  const finalPrice = totalCost * (1 + parts.markup)
  const marginAmount = finalPrice - totalCost
  const marginPct = finalPrice === 0 ? 0 : marginAmount / finalPrice
  return {
    labor: parts.labor,
    glass: parts.glass,
    aluminum: parts.aluminum,
    hardware: parts.hardware,
    accessories: parts.accessories,
    extras: parts.extras,
    totalCost,
    finalPrice,
    marginPct,
    marginAmount,
    markup: parts.markup,
  }
}

/** Adjust span in meters like calc_BOX F15 */
export function adjustBoxSpanM(spanM: number): number {
  const mod = spanM % 0.05
  // floating remainder near 0
  const m = Math.abs(mod) < 1e-9 ? 0 : mod
  if (m <= 0.02) return spanM - m
  return spanM + (0.05 - m)
}

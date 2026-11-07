import type { Catalog, EspelhoInput, FixoInput, PricingResult } from '../types'
import {
  buildBreakdown,
  ceiling,
  findAcessorio,
  findAluminio,
  findVidro,
  laborLine,
  roundUp,
  sumItemExtras,
} from './math'

/** Vidro temperado fixo (painel) — derived from sheet labor/glass rules */
export function priceFixo(catalog: Catalog, input: FixoInput): PricingResult {
  const { config } = catalog
  const areaVao = ceiling((input.widthMm * input.heightMm) / 1e6, 0.1)
  const glassW = ceiling(input.widthMm, 50)
  const glassH = ceiling(input.heightMm, 50)
  const glassM2 = roundUp((glassW * glassH) / 1e6, 3)
  const vidro = findVidro(catalog, 'Temperado', input.glassColor, input.thicknessMm)
  const unit = vidro.valorM2 ?? 0
  const billedM2 = Math.max(glassM2, 0.25)
  const glassCost = unit * billedM2

  const silicone = findAcessorio(catalog, 'SILICONE ACT')
  const siliconeQty = Math.max(1, Math.ceil(areaVao))
  const accessories = silicone.valor * siliconeQty
  const labor = areaVao * config.labor.temperedPerM2
  const frameMeters =
    input.thicknessMm === '06' || input.thicknessMm === '08'
      ? ceiling(2 * input.widthMm + 2 * input.heightMm, 500) / 1000
      : 0
  const al66 = frameMeters > 0 ? findAluminio(catalog, 'AL 66') : null
  const aluminum = al66 ? al66.valorMetro * frameMeters : 0

  const breakdown = buildBreakdown({
    labor,
    glass: glassCost,
    aluminum,
    hardware: 0,
    accessories,
    extras: sumItemExtras(input.extras),
    markup: input.markup,
  })

  return {
    kind: 'fixo',
    label: `Vidro fixo temperado — ${input.widthMm}×${input.heightMm} mm (${input.glassColor} ${input.thicknessMm}mm)`,
    bom: [
      {
        code: vidro.codigo,
        description: `Vidro temperado ${input.glassColor} ${input.thicknessMm}mm`,
        quantity: billedM2,
        unitPrice: unit,
        total: glassCost,
        category: 'vidro',
        unit: 'm2',
        source: { table: 'vidros', id: vidro.id },
      },
      ...(al66
        ? [
            {
              code: al66.codigo,
              description: al66.descricao || al66.codigo,
              quantity: frameMeters,
              unitPrice: al66.valorMetro,
              total: aluminum,
              category: 'aluminio' as const,
              unit: 'm' as const,
              source: { table: 'aluminios' as const, id: al66.id },
            },
          ]
        : []),
      {
        code: silicone.codigo,
        description: silicone.descricao,
        quantity: siliconeQty,
        unitPrice: silicone.valor,
        total: accessories,
        category: 'acessorio',
        unit: 'un',
        source: { table: 'acessorios', id: silicone.id },
      },
      laborLine(areaVao, 'm2', config.labor.temperedPerM2, labor),
    ],
    breakdown,
    notes: [
      `Área de vão ${areaVao.toFixed(1)} m²`,
      glassM2 < 0.25 ? 'Mínimo de 0,25 m² aplicado no vidro' : undefined,
    ].filter(Boolean) as string[],
  }
}

/** Espelho lapidado ou bisotado */
export function priceEspelho(
  catalog: Catalog,
  input: EspelhoInput,
): PricingResult {
  const { config } = catalog
  const areaVao = ceiling((input.widthMm * input.heightMm) / 1e6, 0.1)
  const glassW = ceiling(input.widthMm, 50)
  const glassH = ceiling(input.heightMm, 50)
  const glassM2 = roundUp((glassW * glassH) / 1e6, 3)
  const vidro = findVidro(catalog, input.finish, input.glassColor, input.thicknessMm)
  const unit = vidro.valorM2 ?? 0
  const billedM2 = Math.max(glassM2, 0.25)
  const glassCost = unit * billedM2

  // Espelhos often use Prata as default color in catalog
  const labor = areaVao * config.labor.temperedPerM2

  const breakdown = buildBreakdown({
    labor,
    glass: glassCost,
    aluminum: 0,
    hardware: 0,
    accessories: 0,
    extras: sumItemExtras(input.extras),
    markup: input.markup,
  })

  return {
    kind: 'espelho',
    label: `${input.finish} — ${input.widthMm}×${input.heightMm} mm (${input.glassColor} ${input.thicknessMm}mm)`,
    bom: [
      {
        code: vidro.codigo,
        description: `${input.finish} ${input.glassColor} ${input.thicknessMm}mm`,
        quantity: billedM2,
        unitPrice: unit,
        total: glassCost,
        category: 'vidro',
        unit: 'm2',
        source: { table: 'vidros', id: vidro.id },
      },
      laborLine(areaVao, 'm2', config.labor.temperedPerM2, labor),
    ],
    breakdown,
    notes: [
      `Área de vão ${areaVao.toFixed(1)} m²`,
      glassM2 < 0.25 ? 'Mínimo de 0,25 m² aplicado' : undefined,
    ].filter(Boolean) as string[],
  }
}

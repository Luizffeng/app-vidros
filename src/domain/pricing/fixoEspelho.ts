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
export function priceFixo(
  catalog: Catalog,
  input: FixoInput,
  use8mmAluminumOn6mmGlass = true,
): PricingResult {
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
  const frameCode =
    input.thicknessMm === '10'
      ? 'AL 67'
      : input.thicknessMm === '08'
        ? 'AL 66'
        : input.thicknessMm === '06'
          ? use8mmAluminumOn6mmGlass
            ? 'AL 66'
            : 'AL 96'
          : null
  const frameMeters = frameCode
    ? ceiling(2 * input.widthMm + 2 * input.heightMm, 500) / 1000
    : 0
  const frame = frameCode && frameMeters > 0 ? findAluminio(catalog, frameCode) : null
  const aluminum = frame ? frame.valorMetro * frameMeters : 0

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
      ...(frame
        ? [
            {
              code: frame.codigo,
              description: frame.descricao || frame.codigo,
              quantity: frameMeters,
              unitPrice: frame.valorMetro,
              total: aluminum,
              category: 'aluminio' as const,
              unit: 'm' as const,
              source: { table: 'aluminios' as const, id: frame.id },
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

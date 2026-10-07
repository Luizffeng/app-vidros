import type { BomLine, Catalog, PivotanteInput, PricingResult } from '../types'
import {
  aluminumSurcharge,
  buildBreakdown,
  ceiling,
  findAcessorio,
  findAluminio,
  findVidro,
  laborLine,
  roundUp,
  sumItemExtras,
  withSurcharge,
} from './math'

export function pricePivotante(
  catalog: Catalog,
  input: PivotanteInput,
): PricingResult {
  const { config } = catalog
  const surcharge = aluminumSurcharge(config, input.profileColor)
  const areaVao = ceiling((input.widthMm * input.heightMm) / 1e6, 0.1)

  const glassW = ceiling(input.widthMm, 50)
  const glassH = ceiling(input.heightMm, 50)
  const glassM2 = roundUp((glassW * glassH) / 1e6, 3)
  const vidro = findVidro(catalog, 'Temperado', input.glassColor, input.thicknessMm)
  const glassCost = glassM2 * (vidro.valorM2 ?? 0)

  const cantQty = ceiling(input.heightMm * 2 + input.widthMm, 500) / 1000
  const cantoneira = findAluminio(catalog, 'CANT 5/8"')

  const kit = findAcessorio(catalog, 'KIT 01')
  const puxador = findAcessorio(catalog, 'H30X20')
  const trinco = findAcessorio(catalog, '1335')
  const cap = findAcessorio(catalog, '1038')
  const silicone = findAcessorio(catalog, 'SILICONE ACT')

  const aluminumRaw = cantoneira.valorMetro * cantQty
  const latchQty = input.hasLatch ? 1 : 0
  const hardwareRaw =
    kit.valor * 1 + puxador.valor * 1 + trinco.valor * latchQty + cap.valor * 1
  const accessories = silicone.valor * 1

  const labor = areaVao * config.labor.temperedPerM2

  const hw = (a: { id: number; codigo: string; descricao: string; valor: number }): BomLine =>
    withSurcharge(
      {
        code: a.codigo,
        description: a.descricao,
        quantity: 1,
        unitPrice: a.valor,
        total: a.valor,
        category: 'ferragem',
        unit: 'un',
        source: { table: 'acessorios', id: a.id },
      },
      surcharge,
    )

  const bom: BomLine[] = [
    {
      code: vidro.codigo,
      description: `Vidro temperado ${input.glassColor} ${input.thicknessMm}mm`,
      quantity: glassM2,
      unitPrice: vidro.valorM2 ?? 0,
      total: glassCost,
      category: 'vidro',
      unit: 'm2',
      source: { table: 'vidros', id: vidro.id },
    },
    withSurcharge(
      {
        code: cantoneira.codigo,
        description: cantoneira.descricao ?? 'Cantoneira',
        quantity: cantQty,
        unitPrice: cantoneira.valorMetro,
        total: aluminumRaw,
        category: 'aluminio',
        unit: 'm',
        source: { table: 'aluminios', id: cantoneira.id },
      },
      surcharge,
    ),
    hw(kit),
    hw(puxador),
    ...(latchQty ? [hw(trinco)] : []),
    hw(cap),
    {
      code: silicone.codigo,
      description: silicone.descricao,
      quantity: 1,
      unitPrice: silicone.valor,
      total: silicone.valor,
      category: 'acessorio',
      unit: 'un',
      source: { table: 'acessorios', id: silicone.id },
    },
    laborLine(areaVao, 'm2', config.labor.temperedPerM2, labor),
  ]

  const breakdown = buildBreakdown({
    labor,
    glass: glassCost,
    aluminum: aluminumRaw * (1 + surcharge),
    hardware: hardwareRaw * (1 + surcharge),
    accessories,
    extras: sumItemExtras(input.extras),
    markup: input.markup,
  })

  return {
    kind: 'pivotante',
    label: `Pivotante — ${input.widthMm}×${input.heightMm} mm`,
    bom,
    breakdown,
  }
}

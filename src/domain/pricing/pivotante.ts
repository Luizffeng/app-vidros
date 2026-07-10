import type { Catalog, PivotanteInput, PricingResult } from '../types'
import {
  aluminumSurcharge,
  buildBreakdown,
  ceiling,
  findAcessorio,
  findAluminio,
  findVidro,
  roundUp,
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

  const bom = [
    {
      code: vidro.codigo,
      description: `Vidro temperado ${input.glassColor} ${input.thicknessMm}mm`,
      quantity: glassM2,
      unitPrice: vidro.valorM2 ?? 0,
      total: glassCost,
      category: 'vidro' as const,
    },
    {
      code: cantoneira.codigo,
      description: cantoneira.descricao ?? 'Cantoneira',
      quantity: cantQty,
      unitPrice: cantoneira.valorMetro,
      total: aluminumRaw,
      category: 'aluminio' as const,
    },
    {
      code: kit.codigo,
      description: kit.descricao,
      quantity: 1,
      unitPrice: kit.valor,
      total: kit.valor,
      category: 'ferragem' as const,
    },
    {
      code: puxador.codigo,
      description: puxador.descricao,
      quantity: 1,
      unitPrice: puxador.valor,
      total: puxador.valor,
      category: 'ferragem' as const,
    },
    ...(latchQty
      ? [
          {
            code: trinco.codigo,
            description: trinco.descricao,
            quantity: 1,
            unitPrice: trinco.valor,
            total: trinco.valor,
            category: 'ferragem' as const,
          },
        ]
      : []),
    {
      code: cap.codigo,
      description: cap.descricao,
      quantity: 1,
      unitPrice: cap.valor,
      total: cap.valor,
      category: 'ferragem' as const,
    },
    {
      code: silicone.codigo,
      description: silicone.descricao,
      quantity: 1,
      unitPrice: silicone.valor,
      total: silicone.valor,
      category: 'acessorio' as const,
    },
  ]

  const breakdown = buildBreakdown({
    labor,
    glass: glassCost,
    aluminum: aluminumRaw * (1 + surcharge),
    hardware: hardwareRaw * (1 + surcharge),
    accessories,
    extras: input.extras || 0,
    markup: input.markup,
  })

  return {
    kind: 'pivotante',
    label: `Pivotante — ${input.widthMm}×${input.heightMm} mm`,
    bom,
    breakdown,
  }
}

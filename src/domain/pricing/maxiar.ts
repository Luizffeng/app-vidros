import { isCatalogItemActive } from '../catalogActive'
import type { BomLine, Catalog, MaxiarInput, PricingResult } from '../types'
import {
  aluminumSurcharge,
  buildBreakdown,
  ceiling,
  findAcessorio,
  findVidro,
  laborLine,
  roundUp,
  sumItemExtras,
  withSurcharge,
} from './math'

export function priceMaxiar(catalog: Catalog, input: MaxiarInput): PricingResult {
  const { config } = catalog
  const surcharge = aluminumSurcharge(config, input.profileColor)
  const areaVao = ceiling((input.widthMm * input.heightMm) / 1e6, 0.1)

  const glassW = ceiling(input.widthMm, 50)
  const glassH = ceiling(input.heightMm, 50)
  const glassM2 = roundUp((glassW * glassH) / 1e6, 3)
  const vidro = findVidro(catalog, 'Temperado', input.glassColor, input.thicknessMm)
  const unit = vidro.valorM2 ?? 0
  // Minimum billed area 0.25 m²
  const glassCost = glassM2 < 0.25 ? unit * 0.25 : unit * glassM2

  const cantoneira =
    catalog.aluminios.find(
      (a) => isCatalogItemActive(a) && a.codigo === 'CANT 5/8"',
    ) ??
    catalog.aluminios.find(
      (a) => isCatalogItemActive(a) && a.descricao?.includes('CANTONEIRA 15'),
    )
  if (!cantoneira) throw new Error('Cantoneira 15x15 não encontrada')

  const cantQty = ceiling(input.heightMm * 2 + input.widthMm * 2, 500) / 1000
  const aluminumRaw = cantoneira.valorMetro * cantQty

  const dob = findAcessorio(catalog, 'DOB V/A')
  const haste = findAcessorio(catalog, 'HASTE V/A')
  const silicone = findAcessorio(catalog, 'SILICONE ACT')

  const hardwareRaw = dob.valor + haste.valor
  const accessories = silicone.valor

  const labor = config.labor.maxiarAvulso

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
      quantity: Math.max(glassM2, 0.25),
      unitPrice: unit,
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
    hw(dob),
    hw(haste),
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
    laborLine(1, 'un', config.labor.maxiarAvulso, labor),
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
    kind: 'maxiar',
    label: `Maxim-ar — ${input.widthMm}×${input.heightMm} mm`,
    bom,
    breakdown,
    notes: areaVao ? [`Vão ${areaVao.toFixed(1)} m²`] : undefined,
  }
}

import type { BoxForaPadraoInput, BoxInput, Catalog, PricingResult } from '../types'
import {
  adjustBoxSpanM,
  aluminumSurcharge,
  buildBreakdown,
  ceiling,
  findAcessorio,
  findAluminio,
  findKitBox,
  findVidro,
  laborLine,
  nearestKitSize,
  sumItemExtras,
  withSurcharge,
} from './math'

function boxGlassWidthsM(adjustedSpanM: number): { fixedGlass: number; movingGlass: number } {
  const fixedGlass =
    Math.abs(adjustedSpanM % 0.1) < 0.001 ? adjustedSpanM / 2 : (adjustedSpanM + 0.05) / 2
  const movingGlass =
    Math.abs(adjustedSpanM % 0.1) < 0.001
      ? adjustedSpanM / 2 + 0.05
      : (adjustedSpanM + 0.05) / 2
  return { fixedGlass, movingGlass }
}

function boxLabor(
  config: Catalog['config'],
  areaM2: number,
  laborFixed: boolean | undefined,
): { quantity: number; unit: 'm2' | 'un'; rate: number; total: number; fixed: boolean } {
  const fixed = laborFixed === true
  const quantity = fixed ? 1 : areaM2
  const unit = fixed ? 'un' : 'm2'
  const rate = fixed ? config.labor.boxAvulso : config.labor.boxPerM2
  return { quantity, unit, rate, total: quantity * rate, fixed }
}

export function priceBox(catalog: Catalog, input: BoxInput): PricingResult {
  const { config } = catalog
  const spanM = input.spanCm / 100
  const adjusted = adjustBoxSpanM(spanM)
  const height = config.boxDefaultHeightM
  const { fixedGlass, movingGlass } = boxGlassWidthsM(adjusted)

  const kitSize = nearestKitSize(config.kitBoxSizesCm, input.spanCm)
  const vidro = findVidro(catalog, 'Box', input.glassColor, '08')
  const kit = findKitBox(catalog, input.profileColor, kitSize)
  const silicone = findAcessorio(catalog, 'SILICONE ACT')

  const labor = boxLabor(config, spanM * height, input.laborFixed)
  const glassM2 = (fixedGlass + movingGlass) * height
  const glass = glassM2 * (vidro.valorM2 ?? 0)
  const kitCost = kit.valor ?? 0
  const siliconeCost = silicone.valor * 1
  const extras = sumItemExtras(input.extras)

  const breakdown = buildBreakdown({
    labor: labor.total,
    glass,
    aluminum: 0,
    hardware: kitCost,
    accessories: siliconeCost,
    extras,
    markup: input.markup,
  })

  return {
    kind: 'box',
    label: `Box frontal 2F — vão ${input.spanCm} cm (${input.glassColor}/${input.profileColor})`,
    bom: [
      {
        code: vidro.codigo,
        description: `Vidro box ${input.glassColor}`,
        quantity: glassM2,
        unitPrice: vidro.valorM2 ?? 0,
        total: glass,
        category: 'vidro',
        unit: 'm2',
        source: { table: 'vidros', id: vidro.id },
      },
      {
        code: kit.codigo,
        description: `${kit.tipo} ${kit.cor} ${kitSize} cm`,
        quantity: 1,
        unitPrice: kitCost,
        total: kitCost,
        category: 'ferragem',
        unit: 'un',
        source: { table: 'kitBox', id: kit.id },
      },
      {
        code: silicone.codigo,
        description: silicone.descricao,
        quantity: 1,
        unitPrice: silicone.valor,
        total: siliconeCost,
        category: 'acessorio',
        unit: 'un',
        source: { table: 'acessorios', id: silicone.id },
      },
      laborLine(labor.quantity, labor.unit, labor.rate, labor.total),
    ],
    breakdown,
    notes: [
      `Altura padrão ${height} m`,
      `Vidro fixo ${fixedGlass.toFixed(2)} m / móvel ${movingGlass.toFixed(2)} m`,
      `Kit ${kitSize} cm`,
      labor.fixed ? 'Mão de obra fixa (box avulso)' : 'Mão de obra por m²',
    ],
  }
}

/** Box fora do padrão: mesma folga de vão do box, altura informada, vidro temperado 08, + AL 66 e AL 67. */
export function priceBoxForaPadrao(catalog: Catalog, input: BoxForaPadraoInput): PricingResult {
  const { config } = catalog
  const spanM = input.widthMm / 1000
  const spanCm = input.widthMm / 10
  const adjusted = adjustBoxSpanM(spanM)
  const height = input.heightMm / 1000
  const { fixedGlass, movingGlass } = boxGlassWidthsM(adjusted)

  const kitSize = nearestKitSize(config.kitBoxSizesCm, spanCm)
  const vidro = findVidro(catalog, 'Temperado', input.glassColor, '08')
  const kit = findKitBox(catalog, input.profileColor, kitSize)
  const silicone = findAcessorio(catalog, 'SILICONE ACT')
  const al66 = findAluminio(catalog, 'AL 66')
  const al67 = findAluminio(catalog, 'AL 67')
  const surcharge = aluminumSurcharge(config, input.profileColor)
  const aluQty = ceiling(input.heightMm, 500) / 1000

  const labor = boxLabor(config, spanM * height, input.laborFixed)
  const glassM2 = (fixedGlass + movingGlass) * height
  const glass = glassM2 * (vidro.valorM2 ?? 0)
  const kitCost = kit.valor ?? 0
  const siliconeCost = silicone.valor * 1
  const al66Raw = al66.valorMetro * aluQty
  const al67Raw = al67.valorMetro * aluQty
  const aluminum = (al66Raw + al67Raw) * (1 + surcharge)
  const extras = sumItemExtras(input.extras)

  const breakdown = buildBreakdown({
    labor: labor.total,
    glass,
    aluminum,
    hardware: kitCost,
    accessories: siliconeCost,
    extras,
    markup: input.markup,
  })

  return {
    kind: 'boxForaPadrao',
    label: `Box fora do padrão — ${input.widthMm}×${input.heightMm} mm (${input.glassColor}/${input.profileColor})`,
    bom: [
      {
        code: vidro.codigo,
        description: `Vidro temperado ${input.glassColor} 08mm`,
        quantity: glassM2,
        unitPrice: vidro.valorM2 ?? 0,
        total: glass,
        category: 'vidro',
        unit: 'm2',
        source: { table: 'vidros', id: vidro.id },
      },
      {
        code: kit.codigo,
        description: `${kit.tipo} ${kit.cor} ${kitSize} cm`,
        quantity: 1,
        unitPrice: kitCost,
        total: kitCost,
        category: 'ferragem',
        unit: 'un',
        source: { table: 'kitBox', id: kit.id },
      },
      withSurcharge(
        {
          code: al66.codigo,
          description: al66.descricao ?? al66.codigo,
          quantity: aluQty,
          unitPrice: al66.valorMetro,
          total: al66Raw,
          category: 'aluminio',
          unit: 'm',
          source: { table: 'aluminios', id: al66.id },
        },
        surcharge,
      ),
      withSurcharge(
        {
          code: al67.codigo,
          description: al67.descricao ?? al67.codigo,
          quantity: aluQty,
          unitPrice: al67.valorMetro,
          total: al67Raw,
          category: 'aluminio',
          unit: 'm',
          source: { table: 'aluminios', id: al67.id },
        },
        surcharge,
      ),
      {
        code: silicone.codigo,
        description: silicone.descricao,
        quantity: 1,
        unitPrice: silicone.valor,
        total: siliconeCost,
        category: 'acessorio',
        unit: 'un',
        source: { table: 'acessorios', id: silicone.id },
      },
      laborLine(labor.quantity, labor.unit, labor.rate, labor.total),
    ],
    breakdown,
    notes: [
      `Altura ${height} m`,
      `Vidro fixo ${fixedGlass.toFixed(2)} m / móvel ${movingGlass.toFixed(2)} m`,
      `Kit ${kitSize} cm`,
      `AL 66 / AL 67 ${aluQty} m cada`,
      labor.fixed ? 'Mão de obra fixa (box avulso)' : 'Mão de obra por m²',
    ],
  }
}

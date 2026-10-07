import type { BoxInput, Catalog, PricingResult } from '../types'
import {
  adjustBoxSpanM,
  buildBreakdown,
  findAcessorio,
  findKitBox,
  findVidro,
  laborLine,
  nearestKitSize,
  sumItemExtras,
} from './math'

export function priceBox(catalog: Catalog, input: BoxInput): PricingResult {
  const { config } = catalog
  const spanM = input.spanCm / 100
  const adjusted = adjustBoxSpanM(spanM)
  const height = config.boxDefaultHeightM

  const fixedGlass =
    Math.abs(adjusted % 0.1) < 0.001 ? adjusted / 2 : (adjusted + 0.05) / 2
  const movingGlass =
    Math.abs(adjusted % 0.1) < 0.001
      ? adjusted / 2 + 0.05
      : (adjusted + 0.05) / 2

  const kitSize = nearestKitSize(config.kitBoxSizesCm, input.spanCm)
  const vidro = findVidro(catalog, 'Box', input.glassColor, '08')
  const kit = findKitBox(catalog, input.profileColor, kitSize)
  const silicone = findAcessorio(catalog, 'SILICONE ACT')

  const laborM2 = spanM * height
  const labor = laborM2 * config.labor.boxPerM2
  const glassM2 = (fixedGlass + movingGlass) * height
  const glass = glassM2 * (vidro.valorM2 ?? 0)
  const kitCost = kit.valor ?? 0
  const siliconeCost = silicone.valor * config.boxSiliconeQty
  const extras = sumItemExtras(input.extras)

  const breakdown = buildBreakdown({
    labor,
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
        quantity: config.boxSiliconeQty,
        unitPrice: silicone.valor,
        total: siliconeCost,
        category: 'acessorio',
        unit: 'un',
        source: { table: 'acessorios', id: silicone.id },
      },
      laborLine(laborM2, 'm2', config.labor.boxPerM2, labor),
    ],
    breakdown,
    notes: [
      `Altura padrão ${height} m`,
      `Vidro fixo ${fixedGlass.toFixed(2)} m / móvel ${movingGlass.toFixed(2)} m`,
      `Kit ${kitSize} cm`,
    ],
  }
}

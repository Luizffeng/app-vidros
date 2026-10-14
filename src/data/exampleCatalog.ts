import { aluminioValorMetro } from '../domain/catalogEdit'
import type { Catalog } from '../domain/types'

/** Preço "redondo": ≥ 100 → múltiplo de 10; 20 a 100 → múltiplo de 5; abaixo → real inteiro (mínimo 1). Sem preço continua 0. */
export function roundExamplePrice(value: number): number {
  if (value <= 0) return 0
  if (value >= 100) return Math.round(value / 10) * 10
  if (value >= 20) return Math.round(value / 5) * 5
  return Math.max(1, Math.round(value))
}

const roundOrNull = (value: number | null) => (value === null ? null : roundExamplePrice(value))

/** Catálogo inicial de conta nova: o seed com preços redondos e tudo marcado como exemplo. */
export function toExampleCatalog(seed: Catalog): Catalog {
  return {
    config: { ...seed.config, exemplo: true },
    vidros: seed.vidros.map((v) => ({ ...v, valorM2: roundOrNull(v.valorM2), exemplo: true })),
    kitBox: seed.kitBox.map((k) => ({ ...k, valor: roundOrNull(k.valor), exemplo: true })),
    acessorios: seed.acessorios.map((a) => ({ ...a, valor: roundExamplePrice(a.valor), exemplo: true })),
    aluminios: seed.aluminios.map((a) => {
      const valorBarra = roundExamplePrice(a.valorBarra)
      return { ...a, valorBarra, valorMetro: aluminioValorMetro(valorBarra, a.metragemBarra), exemplo: true }
    }),
  }
}

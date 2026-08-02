import type { Catalog, PricingConfig } from '../domain/types'
import config from './seed/config.json'
import vidros from './seed/vidros.json'
import kitBox from './seed/kitBox.json'
import acessorios from './seed/acessorios.json'
import aluminios from './seed/aluminios.json'

export function normalizePricingConfig(raw: PricingConfig): PricingConfig {
  // Remove legado quoteValidityDays se existir em IndexedDB antigo
  const { quoteValidityDays: _legacy, ...rest } = raw as PricingConfig & {
    quoteValidityDays?: number
  }
  void _legacy
  return rest
}

export function loadSeedCatalog(): Catalog {
  return {
    config: normalizePricingConfig(config as PricingConfig),
    vidros: vidros as Catalog['vidros'],
    kitBox: kitBox as Catalog['kitBox'],
    acessorios: acessorios as Catalog['acessorios'],
    aluminios: aluminios as Catalog['aluminios'],
  }
}

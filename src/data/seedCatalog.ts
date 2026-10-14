import type { Catalog, PricingConfig } from '../domain/types'
import config from './seed/config.json'
import vidros from './seed/vidros.json'
import kitBox from './seed/kitBox.json'
import acessorios from './seed/acessorios.json'
import aluminios from './seed/aluminios.json'

export function normalizePricingConfig(raw: PricingConfig): PricingConfig {
  // Remove legados: quoteValidityDays (IndexedDB antigo), boxSiliconeQty (box usa 1 silicone)
  const {
    quoteValidityDays: _legacyDays,
    boxSiliconeQty: _legacySilicone,
    ...rest
  } = raw as PricingConfig & {
    quoteValidityDays?: number
    boxSiliconeQty?: number
  }
  void _legacyDays
  void _legacySilicone
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

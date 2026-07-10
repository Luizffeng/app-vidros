import type { Catalog } from '../domain/types'
import config from './seed/config.json'
import vidros from './seed/vidros.json'
import kitBox from './seed/kitBox.json'
import acessorios from './seed/acessorios.json'
import aluminios from './seed/aluminios.json'

export function loadSeedCatalog(): Catalog {
  return {
    config: config as Catalog['config'],
    vidros: vidros as Catalog['vidros'],
    kitBox: kitBox as Catalog['kitBox'],
    acessorios: acessorios as Catalog['acessorios'],
    aluminios: aluminios as Catalog['aluminios'],
  }
}

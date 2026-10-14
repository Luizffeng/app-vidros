import { fillCompany } from '../data/company'
import type { PublicPage } from '../nav/routes'
import privacy from './legal/politica-de-privacidade.md?raw'
import terms from './legal/termos-de-uso.md?raw'
import news from './novidades.md?raw'

export const PAGE_SOURCES: Record<PublicPage, string> = {
  terms: fillCompany(terms),
  privacy: fillCompany(privacy),
  news,
}

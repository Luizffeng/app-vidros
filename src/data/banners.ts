import type { Route } from '../nav/routes'

export interface Banner {
  id: string
  title: string
  /** Up to 2 lines at 360 px. */
  text: string
  /** Path under `public/`, e.g. `/banners/novidades.webp`. */
  image?: string
  action?: { route: Route } | { url: string }
  /** ISO date (YYYY-MM-DD), inclusive. */
  from?: string
  until?: string
}

export const MAX_BANNERS = 5

/** Shown when dated banners leave fewer than 2 on screen. */
export const DEFAULT_BANNERS: Banner[] = [
  {
    id: 'bem-vindo',
    title: 'Orçamento na hora',
    text: 'Monte, emita e envie pelo WhatsApp sem sair da obra.',
    action: { route: { screen: 'quotes' } },
  },
  {
    id: 'catalogo',
    title: 'Seus preços, seu catálogo',
    text: 'Atualize vidros, kits e alumínios; os rascunhos avisam quando algo muda.',
    action: { route: { screen: 'catalog', tab: 'vidros' } },
  },
]

/** Published with each app version; the owner edits this list. */
export const BANNERS: Banner[] = [
  {
    id: 'em-breve-ajuda',
    title: 'Em breve: Ajuda',
    text: 'Dicas rápidas para tirar medidas e montar cada tipo de item.',
  },
  {
    id: 'plano-anual',
    title: 'Plano anual vem aí',
    text: 'Sabia que no plano anual você vai economizar? Fique de olho nas novidades.',
  },
  {
    id: 'novidades',
    title: 'Novidades do app',
    text: 'Agora o botão voltar do celular funciona dentro do app, e você tem esta tela de Início.',
  },
]

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function visibleBanners(all: readonly Banner[], now: Date): Banner[] {
  const today = dayKey(now)
  const live = all.filter((b) => (!b.from || b.from <= today) && (!b.until || today <= b.until))
  return (live.length >= 2 ? live : DEFAULT_BANNERS).slice(0, MAX_BANNERS)
}

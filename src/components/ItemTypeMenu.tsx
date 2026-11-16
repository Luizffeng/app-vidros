import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { CorrerSubtype, ProductKind } from '../domain/types'
import correrJ2f from '../../assets/item-images/svg/janela-2f-aluminio.svg'
import correrJ4f from '../../assets/item-images/svg/janela-4f-aluminio.svg'
import correrP1f from '../../assets/item-images/svg/porta-correr-1f-aluminio.svg'
import correrP2f from '../../assets/item-images/svg/porta-correr-2f-aluminio.svg'
import correrP4f from '../../assets/item-images/svg/porta-correr-4f-aluminio.svg'
import pivotante from '../../assets/item-images/svg/porta-pivotante-aluminio.svg'
import maxiar from '../../assets/item-images/svg/maxim-ar-aluminio.svg'
import { useDismiss } from './useDismiss'

/** Same breakpoint as the quote list: desktop overlays, phones push the rows. */
const DESKTOP = '(min-width: 721px)'

export type ItemTypeChoice = {
  kind: ProductKind
  subtype?: CorrerSubtype
}

const CORRER: { id: CorrerSubtype; label: string; image: string }[] = [
  { id: 'J2F', label: 'Janela 2 folhas (J2F)', image: correrJ2f },
  { id: 'J4F', label: 'Janela 4 folhas (J4F)', image: correrJ4f },
  { id: 'P1F', label: 'Porta 1 folha (P1F)', image: correrP1f },
  { id: 'P2F', label: 'Porta 2 folhas (P2F)', image: correrP2f },
  { id: 'P4F', label: 'Porta 4 folhas (P4F)', image: correrP4f },
]

type SubtypeRow = { id: string; label: string; image?: string; subtype?: CorrerSubtype }

type Family = {
  id: ProductKind
  label: string
  image?: string
  subtypes?: SubtypeRow[]
}

/**
 * Box até o teto and Box de canto stay out: formula, materials, and measures
 * are not decided, and selecting them would need a new price.
 */
const FAMILIES: Family[] = [
  {
    id: 'box',
    label: 'Box',
    subtypes: [{ id: 'padrao', label: 'Box padrão' }],
  },
  {
    id: 'correr',
    label: 'Correr',
    image: correrJ2f,
    subtypes: CORRER.map((row) => ({ id: row.id, label: row.label, image: row.image, subtype: row.id })),
  },
  { id: 'pivotante', label: 'Pivotante', image: pivotante },
  { id: 'maxiar', label: 'Maxim-ar', image: maxiar },
  // assets/item-images/png/fixo.png does not decode, and there is no SVG yet.
  { id: 'fixo', label: 'Vidro fixo' },
  { id: 'espelho', label: 'Espelho' },
  { id: 'custom', label: 'Avulso / texto' },
]

export function itemTypeLabel(kind: ProductKind, subtype?: CorrerSubtype): string {
  if (kind === 'box') return 'Box padrão'
  if (kind === 'correr' && subtype) return CORRER.find((row) => row.id === subtype)?.label ?? 'Correr'
  return FAMILIES.find((family) => family.id === kind)?.label ?? kind
}

export function ItemTypeMenu({ onChoose }: { onChoose: (choice: ItemTypeChoice) => void }) {
  const desktop = useMediaQuery(DESKTOP)
  const [openId, setOpenId] = useState<ProductKind | null>(null)
  const openRef = useRef<HTMLLIElement>(null)
  const open = openId != null
  useDismiss(desktop && open, openRef, () => setOpenId(null))

  useEffect(() => {
    if (!desktop || !openId) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setOpenId(null)
    }
    // The click after an outside pointerdown would also close the modal.
    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element) || target.closest('.modal')) return
      event.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.removeEventListener('click', onClick, true)
    }
  }, [desktop, openId])

  return (
    <ul className="item-type-list">
      {FAMILIES.map((family) => {
        const subtypes = family.subtypes ?? []
        const many = subtypes.length > 0
        const isOpen = many && openId === family.id
        return (
          <li
            key={family.id}
            ref={isOpen ? openRef : undefined}
            className={`item-type-group${isOpen ? ' item-type-group--open' : ''}`}
          >
            <button
              type="button"
              className="item-type"
              aria-expanded={many ? isOpen : undefined}
              onClick={() => {
                if (!many) {
                  onChoose({ kind: family.id })
                  return
                }
                setOpenId(isOpen ? null : family.id)
              }}
            >
              <span className="item-type__name">{family.label}</span>
              {family.image && <img className="item-type__drawing" src={family.image} alt="" />}
              {many && <ChevronIcon />}
            </button>
            {isOpen && (
              <ul className="item-type-subs" aria-label={`Modelos de ${family.label}`}>
                {subtypes.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className="item-type item-type--sub"
                      onClick={() => onChoose({ kind: family.id, subtype: row.subtype })}
                    >
                      <span className="item-type__name">{row.label}</span>
                      {row.image && <img className="item-type__drawing" src={row.image} alt="" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', notify)
      return () => list.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

function ChevronIcon() {
  return (
    <svg className="item-type__chevron" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 9l6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

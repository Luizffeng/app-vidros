import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useAccess } from '../auth/access'
import { useDismiss } from './useDismiss'
import { usePresence } from './usePresence'

export type AppSection = 'list' | 'catalog' | 'settings'

type MenuEntry = {
  id: string
  label: string
  icon: ReactNode
  tag?: string
  disabled?: boolean
  current?: boolean
  dividerBefore?: boolean
  onSelect?: () => void
}

const ICON_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

const QuotesIcon = () => (
  <svg {...ICON_PROPS}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 17h4" />
  </svg>
)

const CatalogIcon = () => (
  <svg {...ICON_PROPS}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)

const GearIcon = () => (
  <svg {...ICON_PROPS}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
)

const HelpIcon = () => (
  <svg {...ICON_PROPS}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
)

const LogoutIcon = () => (
  <svg {...ICON_PROPS}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
)

export function HeaderMenu({
  current,
  onNavigate,
}: {
  current: AppSection
  onNavigate: (section: AppSection) => void
}) {
  const access = useAccess()
  const [open, setOpen] = useState(false)
  const menu = usePresence(open, 'xs')
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const menuId = useId()

  const close = (restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) buttonRef.current?.focus({ preventScroll: true })
  }

  useDismiss(open, wrapRef, (reason) => close(reason === 'escape'))

  const entries: MenuEntry[] = []
  const isAdmin = access.role !== 'vendedor'
  if (isAdmin) {
    entries.push(
      {
        id: 'list',
        label: 'Orçamentos',
        icon: <QuotesIcon />,
        current: current === 'list',
        onSelect: () => onNavigate('list'),
      },
      {
        id: 'catalog',
        label: 'Catálogo',
        icon: <CatalogIcon />,
        current: current === 'catalog',
        onSelect: () => onNavigate('catalog'),
      },
      {
        id: 'settings',
        label: 'Configurações',
        icon: <GearIcon />,
        current: current === 'settings',
        onSelect: () => onNavigate('settings'),
      },
    )
  }
  entries.push({
    id: 'help',
    label: 'Ajuda',
    icon: <HelpIcon />,
    tag: 'em breve',
    disabled: true,
    dividerBefore: isAdmin,
  })
  if (access.signOut) {
    const signOut = access.signOut
    entries.push({
      id: 'signout',
      label: 'Sair',
      icon: <LogoutIcon />,
      onSelect: () => void signOut(),
    })
  }

  const focusable = entries.map((e, i) => (e.disabled ? -1 : i)).filter((i) => i >= 0)

  useEffect(() => {
    if (!open) return
    const items = itemRefs.current.filter((el): el is HTMLButtonElement => el !== null)
    const first = items.find((el) => el.getAttribute('aria-disabled') !== 'true') ?? items[0]
    first?.focus({ preventScroll: true })
  }, [open])

  const moveFocus = (delta: number | 'first' | 'last') => {
    const order = focusable.length > 0 ? focusable : entries.map((_, i) => i)
    const active = itemRefs.current.findIndex((el) => el === document.activeElement)
    const pos = order.indexOf(active)
    let next: number
    if (delta === 'first') next = 0
    else if (delta === 'last') next = order.length - 1
    else next = pos < 0 ? 0 : (pos + delta + order.length) % order.length
    itemRefs.current[order[next]]?.focus({ preventScroll: true })
  }

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') moveFocus(1)
    else if (event.key === 'ArrowUp') moveFocus(-1)
    else if (event.key === 'Home') moveFocus('first')
    else if (event.key === 'End') moveFocus('last')
    else if (event.key === 'Tab') {
      setOpen(false)
      return
    } else return
    event.preventDefault()
  }

  const choose = (entry: MenuEntry) => {
    if (entry.disabled) return
    close(true)
    entry.onSelect?.()
  }

  return (
    <div className="app-header__menu" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="btn btn-icon app-header__menu-btn"
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(true) : setOpen(true))}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        <svg {...ICON_PROPS}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {menu.mounted && (
        <div
          id={menuId}
          className="app-menu"
          role="menu"
          aria-label="Menu"
          data-state={menu.state}
          onKeyDown={onMenuKeyDown}
        >
          {entries.map((entry, i) => (
            <button
              key={entry.id}
              ref={(el) => {
                itemRefs.current[i] = el
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={`app-menu__item${entry.current ? ' app-menu__item--current' : ''}${
                entry.dividerBefore ? ' app-menu__item--divider' : ''
              }`}
              aria-disabled={entry.disabled || undefined}
              aria-current={entry.current ? 'page' : undefined}
              onClick={() => choose(entry)}
            >
              <span className="app-menu__icon">{entry.icon}</span>
              <span className="app-menu__label">{entry.label}</span>
              {entry.tag && <span className="app-menu__tag">{entry.tag}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function AppHeader({
  title,
  current,
  onNavigate,
}: {
  title: string
  current: AppSection
  onNavigate: (section: AppSection) => void
}) {
  return (
    <header className="topbar app-header">
      <div className="app-header__titles">
        <p className="brand-sm">App Vidros</p>
        <h1 className="title-sm">{title}</h1>
      </div>
      <HeaderMenu current={current} onNavigate={onNavigate} />
    </header>
  )
}

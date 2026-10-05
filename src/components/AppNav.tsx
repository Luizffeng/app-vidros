import { useAccess } from '../auth/access'

export type AppSection = 'list' | 'catalog' | 'settings'

const TABS: { id: AppSection; label: string }[] = [
  { id: 'list', label: 'Orçamentos' },
  { id: 'catalog', label: 'Catálogo' },
]

export function AppNav({
  current,
  onNavigate,
}: {
  current: AppSection
  onNavigate: (section: AppSection) => void
}) {
  const access = useAccess()
  if (access.role === 'vendedor') return null

  return (
    <nav className="app-nav" aria-label="Seções do app">
      {TABS.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`btn app-nav__btn${current === s.id ? ' app-nav__btn--active' : ''}`}
          aria-current={current === s.id ? 'page' : undefined}
          onClick={() => onNavigate(s.id)}
        >
          {s.label}
        </button>
      ))}
    </nav>
  )
}

import { useAccess } from '../auth/access'

export type AppSection = 'list' | 'catalog' | 'settings'

const SECTIONS: { id: AppSection; label: string }[] = [
  { id: 'list', label: 'Orçamentos' },
  { id: 'catalog', label: 'Catálogo' },
  { id: 'settings', label: 'Configurações' },
]

export function AppNav({
  current,
  onNavigate,
}: {
  current: AppSection
  onNavigate: (section: AppSection) => void
}) {
  const access = useAccess()
  const sections = access.role === 'vendedor' ? SECTIONS.filter((s) => s.id === 'list') : SECTIONS

  return (
    <nav className="app-nav" aria-label="Seções do app">
      {sections.map((s) => (
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
      {access.signOut && (
        <button type="button" className="btn ghost app-nav__btn" onClick={() => void access.signOut?.()}>
          Sair
        </button>
      )}
    </nav>
  )
}

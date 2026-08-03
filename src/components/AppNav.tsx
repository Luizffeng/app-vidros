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
  return (
    <nav className="app-nav" aria-label="Seções do app">
      {SECTIONS.map((s) => (
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

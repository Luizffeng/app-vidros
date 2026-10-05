export function SearchField({
  value,
  onChange,
  label,
  placeholder = 'Buscar…',
}: {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
}) {
  return (
    <label className="list-search">
      <svg className="list-search__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        enterKeyHint="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

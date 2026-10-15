import { useLayoutEffect, useRef } from 'react'

/** Tab row with one indicator that slides under the selected tab. Panels use `${idPrefix}-panel-${id}`. */
export function Tabs<T extends string>({
  label,
  idPrefix,
  tabs,
  current,
  onChange,
}: {
  label: string
  idPrefix: string
  tabs: readonly { id: T; label: string }[]
  current: T
  onChange: (tab: T) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const list = ref.current
    if (!list) return
    const place = () => {
      const selected = list.querySelector<HTMLElement>('[aria-selected="true"]')
      if (!selected) return
      list.style.setProperty('--tab-x', `${selected.offsetLeft}px`)
      list.style.setProperty('--tab-w', `${selected.offsetWidth}px`)
      if (!list.dataset.ready) {
        // Commit the first position before enabling the transition, so it does not slide in from 0.
        void list.offsetWidth
        list.dataset.ready = ''
      }
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(list)
    return () => observer.disconnect()
  }, [current])

  return (
    <div className="tabs" role="tablist" aria-label={label} ref={ref}>
      <span className="tabs__indicator" aria-hidden="true" />
      {tabs.map(({ id, label: text }) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${id}`}
          className="tabs__tab"
          aria-selected={current === id}
          aria-controls={`${idPrefix}-panel-${id}`}
          onClick={() => onChange(id)}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

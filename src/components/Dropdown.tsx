import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useDismiss } from './useDismiss'
import { usePresence } from './usePresence'

export type DropdownOption<T extends string> = { value: T; label: string }

export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T
  options: readonly DropdownOption<T>[]
  onChange: (value: T) => void
  /** Nome acessível do controle (ex.: "Filtrar por status"). */
  label: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const list = usePresence(open, 'xs')
  const [activeIndex, setActiveIndex] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const baseId = useId()
  const listId = `${baseId}-list`
  const optionId = (i: number) => `${baseId}-opt-${i}`

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  const selected = options[selectedIndex]

  const openList = (index = selectedIndex) => {
    setActiveIndex(index)
    setOpen(true)
  }

  const close = (restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) buttonRef.current?.focus()
  }

  useDismiss(open, wrapRef, (reason) => close(reason === 'escape'))

  useEffect(() => {
    if (open) listRef.current?.focus()
  }, [open])

  const choose = (index: number) => {
    const option = options[index]
    if (!option) return
    close(true)
    if (option.value !== value) onChange(option.value)
  }

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (open || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return
    event.preventDefault()
    openList()
  }

  const onListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const last = options.length - 1
    if (event.key === 'ArrowDown') setActiveIndex((i) => (i >= last ? 0 : i + 1))
    else if (event.key === 'ArrowUp') setActiveIndex((i) => (i <= 0 ? last : i - 1))
    else if (event.key === 'Home') setActiveIndex(0)
    else if (event.key === 'End') setActiveIndex(last)
    else if (event.key === 'Enter' || event.key === ' ') choose(activeIndex)
    else if (event.key === 'Tab') {
      setOpen(false)
      return
    } else return
    event.preventDefault()
  }

  return (
    <div className={`dropdown${className ? ` ${className}` : ''}`} ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="dropdown__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${label}: ${selected?.label ?? ''}`}
        onClick={() => (open ? close(true) : openList())}
        onKeyDown={onButtonKeyDown}
      >
        <span className="dropdown__value">{selected?.label}</span>
        <svg className="dropdown__chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {list.mounted && (
        <ul
          ref={listRef}
          id={listId}
          className="dropdown__list"
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          aria-activedescendant={optionId(activeIndex)}
          data-state={list.state}
          onKeyDown={onListKeyDown}
        >
          {options.map((option, i) => {
            const isSelected = option.value === value
            return (
              <li
                key={option.value}
                id={optionId(i)}
                role="option"
                aria-selected={isSelected}
                className={`dropdown__option${i === activeIndex ? ' dropdown__option--active' : ''}${isSelected ? ' dropdown__option--selected' : ''}`}
                onPointerEnter={() => setActiveIndex(i)}
                onClick={() => choose(i)}
              >
                <span>{option.label}</span>
                <svg className="dropdown__check" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12.5 10 17.5 19 7" />
                </svg>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

'use client'

import { useEffect, useRef, useState, KeyboardEvent } from 'react'
import styles from './MultiSelect.module.css'

export type Option = { id: number; name: string }

// Searchable dropdown that picks any number of options; picked ones show as
// removable chips above the search box and drop out of the list.
export default function MultiSelect({
  id,
  label,
  options,
  selected,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  options: Option[]
  selected: number[]
  onChange: (ids: number[]) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const pickerRef = useRef<HTMLDivElement>(null)

  const term = query.trim().toLowerCase()
  const selectedOptions = selected
    .map((selectedId) => options.find((option) => option.id === selectedId))
    .filter((option): option is Option => !!option)
  const matches = options.filter(
    (option) => !selected.includes(option.id) && option.name.toLowerCase().includes(term),
  )

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (!open || activeIndex < 0) return
    document.getElementById(`${id}-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [id, open, activeIndex])

  function add(option: Option) {
    onChange([...selected, option.id])
    setQuery('')
    // Keep the highlight on the same row, which now holds the next option
    setActiveIndex((index) => Math.min(index, matches.length - 2))
  }

  function remove(optionId: number) {
    onChange(selected.filter((selectedId) => selectedId !== optionId))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      const step = event.key === 'ArrowDown' ? 1 : -1
      const count = matches.length
      if (count > 0) setActiveIndex((index) => (index + step + count) % count)
    } else if (event.key === 'Enter' && open) {
      // Pick the highlighted option instead of submitting the form
      event.preventDefault()
      const option = matches[activeIndex]
      if (option) add(option)
    } else if (event.key === 'Backspace' && query === '' && selected.length > 0) {
      remove(selected[selected.length - 1])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={pickerRef} className={styles.combobox}>
      <label htmlFor={id}>{label}</label>
      {selectedOptions.length > 0 && (
        <ul className={styles.chips} aria-label={`Selected ${label.toLowerCase()}`}>
          {selectedOptions.map((option) => (
            <li key={option.id} className={styles.chip}>
              {option.name}
              <button type="button" aria-label={`Remove ${option.name}`} onClick={() => remove(option.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-autocomplete="list"
        aria-activedescendant={open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
        placeholder={placeholder}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
          setActiveIndex(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          const next = event.relatedTarget
          if (next && !pickerRef.current?.contains(next)) setOpen(false)
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {open && (
        <ul id={`${id}-options`} role="listbox" aria-multiselectable="true" className={styles.options}>
          {matches.map((option, index) => (
            <li
              key={option.id}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={false}
              className={index === activeIndex ? styles.activeOption : undefined}
              // mousedown, not click: keeps focus in the input
              onMouseDown={(event) => {
                event.preventDefault()
                add(option)
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {option.name}
            </li>
          ))}
          {matches.length === 0 && <li>No matches.</li>}
        </ul>
      )}
    </div>
  )
}

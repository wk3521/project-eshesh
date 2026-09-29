'use client'

import { useEffect, useRef, useState, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { escapeLike } from '@/lib/search'
import noPfp from '@/resources/no_pfp.jpg'

type UserResult = {
  id: string
  full_name: string
  avatar_url: string | null
  school: string | null
  major: string | null
}

const RESULT_LIMIT = 8
const SEARCH_DELAY_MS = 250

export default function UserSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserResult[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  const term = query.trim()

  useEffect(() => {
    if (!term) return

    let cancelled = false
    const timeout = setTimeout(async () => {
      setSearching(true)
      const { data } = await createClient()
        .from('profiles')
        .select('id, full_name, avatar_url, school, major')
        .ilike('full_name', `%${escapeLike(term)}%`)
        .order('full_name')
        .limit(RESULT_LIMIT)
      if (cancelled) return
      setSearching(false)
      setResults(data ?? [])
      setActiveIndex(-1)
    }, SEARCH_DELAY_MS)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [term])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  // Results from an earlier, non-empty query shouldn't linger once the box is cleared
  const shownResults = term ? results : []
  const showList = open && term !== ''

  function goTo(user: UserResult) {
    setOpen(false)
    setQuery('')
    router.push(`/profile/${user.id}`)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const count = shownResults.length
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && count > 0) {
      event.preventDefault()
      setOpen(true)
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((index) => (index + step + count) % count)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      // Enter with nothing highlighted opens the top match
      const user = shownResults[activeIndex] ?? shownResults[0]
      if (user) goTo(user)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-xs"
      onBlur={(event) => {
        const next = event.relatedTarget
        if (next && !event.currentTarget.contains(next)) setOpen(false)
      }}
    >
      <input
        type="search"
        role="combobox"
        aria-label="Search people"
        aria-expanded={showList}
        aria-controls="user-search-results"
        aria-autocomplete="list"
        aria-activedescendant={
          showList && activeIndex >= 0 ? `user-search-result-${activeIndex}` : undefined
        }
        placeholder="Search people"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        className="w-full rounded border border-current/30 bg-transparent px-3 py-1.5"
      />
      {showList && (
        <ul
          id="user-search-results"
          role="listbox"
          aria-busy={searching}
          className="absolute left-0 right-0 top-full z-10 mt-1 max-h-80 overflow-y-auto rounded border border-current/30 bg-background py-1 shadow-lg"
        >
          {shownResults.map((user, index) => (
            <li
              key={user.id}
              id={`user-search-result-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              // mousedown, not click: keeps focus in the input
              onMouseDown={(event) => {
                event.preventDefault()
                goTo(user)
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2 ${
                index === activeIndex ? 'bg-current/10' : ''
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.avatar_url || noPfp.src}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
              <span className="min-w-0">
                <span className="block truncate">{user.full_name}</span>
                {(user.major || user.school) && (
                  <span className="block truncate text-sm opacity-70">
                    {[user.major, user.school].filter(Boolean).join(' · ')}
                  </span>
                )}
              </span>
            </li>
          ))}
          {!searching && shownResults.length === 0 && (
            <li className="px-3 py-2 opacity-70">No people found.</li>
          )}
        </ul>
      )}
    </div>
  )
}

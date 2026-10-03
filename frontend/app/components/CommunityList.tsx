'use client'

import { useState } from 'react'
import JoinButton from '@/app/components/JoinButton'

type Community = { id: string; name: string; description: string | null }

export default function CommunityList({
  communities,
  joinedIds,
}: {
  communities: Community[]
  joinedIds: string[]
}) {
  const [search, setSearch] = useState('')
  const joined = new Set(joinedIds)
  const term = search.trim().toLowerCase()
  const filtered = term ? communities.filter((c) => c.name.toLowerCase().includes(term)) : communities

  return (
    <>
      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search communities"
        className="mt-4 w-full rounded-full border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
      />

      {filtered.length === 0 ? (
        <p className="mt-8 text-center text-neutral-500">No communities match &quot;{search}&quot;.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div>
                <p className="font-semibold">{c.name}</p>
                {c.description && (
                  <p className="mt-0.5 text-sm text-neutral-500">{c.description}</p>
                )}
              </div>
              <JoinButton communityId={c.id} initialJoined={joined.has(c.id)} />
            </div>
          ))}
        </div>
      )}
    </>
  )
}

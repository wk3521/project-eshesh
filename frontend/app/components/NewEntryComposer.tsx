'use client'

import { useState } from 'react'
import NewProject from '@/app/pages/NewProject'
import PostComposer from '@/app/components/PostComposer'

export default function NewEntryComposer({
  communities,
  presetCommunityId,
}: {
  communities: { id: string; name: string }[]
  presetCommunityId?: string
}) {
  const [mode, setMode] = useState<'project' | 'post'>('project')

  return (
    <div>
      <div className="flex gap-2 text-sm">
        <button
          onClick={() => setMode('project')}
          className={`rounded-full px-3 py-1 ${mode === 'project' ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900' : 'border border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300'}`}
        >
          Project
        </button>
        <button
          onClick={() => setMode('post')}
          className={`rounded-full px-3 py-1 ${mode === 'post' ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900' : 'border border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300'}`}
        >
          Text post
        </button>
      </div>

      <div className="mt-4">
        {mode === 'project' ? (
          <NewProject communities={communities} redirectTo="/explore?type=projects" embedded />
        ) : (
          <PostComposer communities={communities} presetCommunityId={presetCommunityId} redirectTo="/explore?type=posts" />
        )}
      </div>
    </div>
  )
}

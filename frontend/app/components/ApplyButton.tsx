'use client'

import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ApplyButton({
  projectId,
  initialApplied,
}: {
  projectId: string
  initialApplied: boolean
}) {
  const [applied, setApplied] = useState(initialApplied)
  const [open, setOpen] = useState(false)
  const [pitch, setPitch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (applied) {
    return <span className="text-sm font-medium text-neutral-500">Applied ✓</span>
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-neutral-800 px-3 py-1 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        Apply to collaborate
      </button>
    )
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const trimmedPitch = pitch.trim()
    const { error } = await supabase
      .from('applications')
      .insert({
        project_id: projectId,
        applicant_id: user.id,
        pitch: trimmedPitch || null,
        // A pitch doubles as a message request to the project owner
        message_request_status: trimmedPitch ? 'pending' : null,
      })

    setSubmitting(false)

    if (error) {
      setError(error.message)
      return
    }
    setApplied(true)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <textarea
        value={pitch}
        onChange={(e) => setPitch(e.target.value)}
        placeholder="Optional: say why you'd be a good fit"
        className="min-h-[60px] resize-none rounded-md border border-neutral-300 bg-transparent p-2 text-sm dark:border-neutral-700"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-neutral-800 px-3 py-1 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {submitting ? 'Sending...' : 'Send application'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-neutral-500">
          Cancel
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    </form>
  )
}

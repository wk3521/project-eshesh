'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from '../pages/Profile.module.css'

export type ProfileRow = {
  id: string
  full_name: string | null
  school: string | null
  major: string | null
  grad_year: number | null
  bio: string | null
  avatar_url: string | null
  created_at: string
}

type EditableField = 'full_name' | 'school' | 'major' | 'grad_year' | 'bio' | 'avatar_url'

const editableFields: { key: EditableField; label: string }[] = [
  { key: 'full_name', label: 'Full Name' },
  { key: 'school', label: 'School' },
  { key: 'major', label: 'Major' },
  { key: 'grad_year', label: 'Grad Year' },
  { key: 'bio', label: 'Bio' },
  { key: 'avatar_url', label: 'Avatar URL' },
]

function toFormValues(profile: ProfileRow): Record<EditableField, string> {
  return {
    full_name: profile.full_name ?? '',
    school: profile.school ?? '',
    major: profile.major ?? '',
    grad_year: profile.grad_year?.toString() ?? '',
    bio: profile.bio ?? '',
    avatar_url: profile.avatar_url ?? '',
  }
}

export default function ProfileDetails({
  profile,
  isOwnProfile,
}: {
  profile: ProfileRow
  isOwnProfile: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState(() => toFormValues(profile))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const gradYear = values.grad_year.trim()
    if (gradYear && !/^\d{4}$/.test(gradYear)) {
      setError('Grad year must be a 4-digit year.')
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: values.full_name.trim(),
        school: values.school.trim() || null,
        major: values.major.trim() || null,
        grad_year: gradYear ? Number(gradYear) : null,
        bio: values.bio.trim() || null,
        avatar_url: values.avatar_url.trim() || null,
      })
      .eq('id', profile.id)
    setSaving(false)

    if (error) {
      setError(error.message)
      return
    }

    setEditing(false)
    router.refresh()
  }

  function handleEdit() {
    setValues(toFormValues(profile))
    setError(null)
    setEditing(true)
  }

  function handleCancel() {
    setEditing(false)
    setError(null)
  }

  const details = (
    <dl className={styles.details}>
      <dt>ID</dt>
      <dd>{profile.id}</dd>
      {editableFields.map(({ key, label }) => (
        <div key={key} className={styles.row}>
          <dt>{editing ? <label htmlFor={key}>{label}</label> : label}</dt>
          <dd>
            {editing ? (
              <input
                id={key}
                type="text"
                value={values[key]}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, [key]: event.target.value }))
                }
                required={key === 'full_name'}
              />
            ) : (
              profile[key]
            )}
          </dd>
        </div>
      ))}
      <dt>Created At</dt>
      <dd>{new Date(profile.created_at).toLocaleString()}</dd>
    </dl>
  )

  if (!editing) {
    return (
      <>
        {details}
        {isOwnProfile && (
          <button type="button" onClick={handleEdit} className={styles.button}>
            Edit
          </button>
        )}
      </>
    )
  }

  return (
    <form onSubmit={handleSave} className={styles.form}>
      {details}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <button type="submit" disabled={saving} className={styles.button}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={handleCancel} disabled={saving} className={styles.button}>
          Cancel
        </button>
      </div>
    </form>
  )
}

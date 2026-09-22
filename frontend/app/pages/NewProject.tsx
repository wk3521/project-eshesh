'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './NewProject.module.css'

const MAX_MEDIA = 5

export default function NewProject() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaving(true)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setSaving(false)
      setError('You must be logged in to create a project.')
      return
    }

    const { error } = await supabase.from('projects').insert({
      owner_id: user.id,
      title: title.trim(),
      description: description.trim(),
      discipline: discipline.trim(),
      media: imageUrls
        .map((url) => url.trim())
        .filter(Boolean)
        .map((url) => ({ type: 'image', url })),
    })

    setSaving(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push('/projects')
    router.refresh()
  }

  return (
    <main className={styles.page}>
      <h1>Create new project</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={5}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="discipline">Discipline</label>
          <input
            id="discipline"
            type="text"
            value={discipline}
            onChange={(event) => setDiscipline(event.target.value)}
            required
          />
        </div>
        <fieldset className={styles.field}>
          <legend>Images (up to {MAX_MEDIA})</legend>
          {imageUrls.map((url, index) => (
            <div key={index} className={styles.mediaRow}>
              <input
                type="url"
                aria-label={`Image URL ${index + 1}`}
                placeholder="https://example.com/image.png"
                value={url}
                onChange={(event) =>
                  setImageUrls((prev) =>
                    prev.map((u, i) => (i === index ? event.target.value : u))
                  )
                }
                required
              />
              <button
                type="button"
                className={styles.button}
                onClick={() =>
                  setImageUrls((prev) => prev.filter((_, i) => i !== index))
                }
              >
                Remove
              </button>
            </div>
          ))}
          {imageUrls.length < MAX_MEDIA && (
            <button
              type="button"
              className={styles.button}
              onClick={() => setImageUrls((prev) => [...prev, ''])}
            >
              Add image link
            </button>
          )}
        </fieldset>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <button type="submit" disabled={saving} className={styles.button}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </form>
    </main>
  )
}

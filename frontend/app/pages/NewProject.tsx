'use client'

import { useEffect, useRef, useState, FormEvent, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { fileExtension } from '@/lib/upload'
import majorJson from '../../resources/majors.json'
import styles from './NewProject.module.css'

const MAX_MEDIA = 5
const MEDIA_BUCKET = 'project-media'

// Must match the projects_discipline_check constraint in the database
const majorOptions: string[] = majorJson as string[]

export default function NewProject({
  communities,
  redirectTo = '/projects',
  embedded = false,
}: {
  communities: { id: string; name: string }[]
  redirectTo?: string
  embedded?: boolean
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [communityId, setCommunityId] = useState(communities[0]?.id ?? '')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [disciplineOpen, setDisciplineOpen] = useState(false)
  const [activeDisciplineIndex, setActiveDisciplineIndex] = useState(-1)
  const disciplinePickerRef = useRef<HTMLDivElement>(null)

  const disciplineTerm = discipline.trim().toLowerCase()
  const disciplineOptions = majorOptions.includes(discipline)
    ? majorOptions
    : majorOptions.filter((major) => major.toLowerCase().includes(disciplineTerm))

  useEffect(() => {
    if (!disciplineOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (!disciplinePickerRef.current?.contains(event.target as Node)) {
        setDisciplineOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [disciplineOpen])

  useEffect(() => {
    if (!disciplineOpen || activeDisciplineIndex < 0) return
    document
      .getElementById(`discipline-option-${activeDisciplineIndex}`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [disciplineOpen, activeDisciplineIndex])

  function selectDiscipline(major: string) {
    setDiscipline(major)
    setDisciplineOpen(false)
    setActiveDisciplineIndex(-1)
  }

  function handleDisciplineKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!disciplineOpen) {
        setDisciplineOpen(true)
        return
      }
      const step = event.key === 'ArrowDown' ? 1 : -1
      const count = disciplineOptions.length
      if (count > 0) setActiveDisciplineIndex((index) => (index + step + count) % count)
    } else if (event.key === 'Enter' && disciplineOpen) {
      // Pick the highlighted major instead of submitting the form
      event.preventDefault()
      const major = disciplineOptions[activeDisciplineIndex]
      if (major) selectDiscipline(major)
    } else if (event.key === 'Escape') {
      setDisciplineOpen(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!majorOptions.includes(discipline)) {
      setError('Choose a discipline from the list.')
      return
    }

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

    const uploadedPaths: string[] = []
    const media: { type: 'image'; url: string }[] = []

    for (const [index, file] of imageFiles.entries()) {
      const path = `${user.id}/${Date.now()}-${index}${fileExtension(file.name)}`
      const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type })
      if (uploadError) {
        await supabase.storage.from(MEDIA_BUCKET).remove(uploadedPaths)
        setSaving(false)
        setError(uploadError.message)
        return
      }
      uploadedPaths.push(path)
      media.push({ type: 'image', url: supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl })
    }

    const { error } = await supabase.from('projects').insert({
      owner_id: user.id,
      community_id: communityId,
      title: title.trim(),
      description: description.trim(),
      discipline,
      media,
    })

    setSaving(false)

    if (error) {
      await supabase.storage.from(MEDIA_BUCKET).remove(uploadedPaths)
      setError(error.message)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  const Container = embedded ? 'div' : 'main'

  if (communities.length === 0) {
    return (
      <Container className={styles.page}>
        {!embedded && <h1>Create new project</h1>}
        <p>
          You need to join a community before posting a project. <Link href="/communities">Browse communities</Link>.
        </p>
      </Container>
    )
  }

  return (
    <Container className={styles.page}>
      {!embedded && <h1>Create new project</h1>}
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="community">Community</label>
          <select
            id="community"
            value={communityId}
            onChange={(event) => setCommunityId(event.target.value)}
            required
          >
            {communities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
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
        <div ref={disciplinePickerRef} className={`${styles.field} ${styles.combobox}`}>
          <label htmlFor="discipline">Discipline</label>
          <input
            id="discipline"
            type="text"
            role="combobox"
            aria-expanded={disciplineOpen}
            aria-controls="discipline-options"
            aria-autocomplete="list"
            aria-activedescendant={
              disciplineOpen && activeDisciplineIndex >= 0
                ? `discipline-option-${activeDisciplineIndex}`
                : undefined
            }
            placeholder="Search majors"
            value={discipline}
            onChange={(event) => {
              setDiscipline(event.target.value)
              setDisciplineOpen(true)
              setActiveDisciplineIndex(0)
            }}
            onFocus={() => setDisciplineOpen(true)}
            onBlur={(event) => {
              const next = event.relatedTarget
              if (next && !disciplinePickerRef.current?.contains(next)) setDisciplineOpen(false)
            }}
            onKeyDown={handleDisciplineKeyDown}
            autoComplete="off"
            required
          />
          {disciplineOpen && (
            <ul id="discipline-options" role="listbox" className={styles.options}>
              {disciplineOptions.map((major, index) => (
                <li
                  key={major}
                  id={`discipline-option-${index}`}
                  role="option"
                  aria-selected={major === discipline}
                  className={index === activeDisciplineIndex ? styles.activeOption : undefined}
                  // mousedown, not click: keeps focus in the input
                  onMouseDown={(event) => {
                    event.preventDefault()
                    selectDiscipline(major)
                  }}
                  onMouseEnter={() => setActiveDisciplineIndex(index)}
                >
                  {major}
                </li>
              ))}
              {disciplineOptions.length === 0 && <li>No matching majors.</li>}
            </ul>
          )}
        </div>
        <fieldset className={styles.field}>
          <legend>Images (up to {MAX_MEDIA})</legend>
          {imageFiles.map((file, index) => (
            <div key={index} className={styles.mediaRow}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(file)} alt="" width={60} height={60} style={{ objectFit: 'cover' }} />
              <span>{file.name}</span>
              <button
                type="button"
                className={styles.button}
                onClick={() => setImageFiles((prev) => prev.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>
          ))}
          {imageFiles.length < MAX_MEDIA && (
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                const picked = Array.from(event.target.files ?? [])
                setImageFiles((prev) => [...prev, ...picked].slice(0, MAX_MEDIA))
                event.target.value = ''
              }}
            />
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
    </Container>
  )
}

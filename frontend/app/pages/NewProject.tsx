'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { fileExtension } from '@/lib/upload'
import MultiSelect, { Option } from '@/app/components/MultiSelect'
import styles from './NewProject.module.css'

const MAX_MEDIA = 5
const MEDIA_BUCKET = 'project-media'

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
  const [disciplineIds, setDisciplineIds] = useState<number[]>([])
  const [tagIds, setTagIds] = useState<number[]>([])
  const [disciplineOptions, setDisciplineOptions] = useState<Option[]>([])
  const [tagOptions, setTagOptions] = useState<Option[]>([])
  const [communityId, setCommunityId] = useState(communities[0]?.id ?? '')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('disciplines').select('id, name').order('name').then(({ data }) => setDisciplineOptions(data ?? []))
    supabase.from('tags').select('id, name').order('name').then(({ data }) => setTagOptions(data ?? []))
  }, [])

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

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        owner_id: user.id,
        community_id: communityId,
        title: title.trim(),
        description: description.trim(),
        media,
      })
      .select('id')
      .single()

    if (error) {
      await supabase.storage.from(MEDIA_BUCKET).remove(uploadedPaths)
      setSaving(false)
      setError(error.message)
      return
    }

    const [{ error: disciplineError }, { error: tagError }] = await Promise.all([
      disciplineIds.length > 0
        ? supabase
            .from('project_discipline')
            .insert(disciplineIds.map((discipline_id) => ({ project_id: project.id, discipline_id })))
        : { error: null },
      tagIds.length > 0
        ? supabase.from('project_tag').insert(tagIds.map((tag_id) => ({ project_id: project.id, tag_id })))
        : { error: null },
    ])

    const joinError = disciplineError ?? tagError
    if (joinError) {
      // Undo the whole save so a retry doesn't leave a duplicate project behind
      await supabase.from('project_discipline').delete().eq('project_id', project.id)
      await supabase.from('project_tag').delete().eq('project_id', project.id)
      await supabase.from('projects').delete().eq('id', project.id)
      await supabase.storage.from(MEDIA_BUCKET).remove(uploadedPaths)
      setSaving(false)
      setError(joinError.message)
      return
    }

    setSaving(false)

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
        <MultiSelect
          id="disciplines"
          label="Disciplines"
          options={disciplineOptions}
          selected={disciplineIds}
          onChange={setDisciplineIds}
          placeholder="Search majors"
        />
        <MultiSelect
          id="tags"
          label="Tags"
          options={tagOptions}
          selected={tagIds}
          onChange={setTagIds}
          placeholder="Search tags"
        />
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

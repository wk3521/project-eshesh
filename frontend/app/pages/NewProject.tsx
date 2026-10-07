'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { fileExtension } from '@/lib/upload'
import { isVideo, type MediaItem } from '@/lib/media'
import MultiSelect, { Option } from '@/app/components/MultiSelect'
import styles from './NewProject.module.css'

const MAX_MEDIA = 5
const MEDIA_BUCKET = 'project-media'

export type EditableProject = {
  id: string
  communityId: string | null
  title: string
  description: string
  media: MediaItem[]
  disciplineIds: number[]
  tagIds: number[]
}

// Storage path of an uploaded file, from its public URL; null for media that
// isn't in our bucket (e.g. older pasted URLs)
function mediaPath(url: string) {
  const marker = `/object/public/${MEDIA_BUCKET}/`
  const at = url.indexOf(marker)
  return at >= 0 ? decodeURIComponent(url.slice(at + marker.length)) : null
}

function onlyIn(ids: number[], others: number[]) {
  return ids.filter((id) => !others.includes(id))
}

export default function NewProject({
  communities,
  redirectTo = '/projects',
  embedded = false,
  project,
}: {
  communities: { id: string; name: string }[]
  redirectTo?: string
  embedded?: boolean
  // Passed when editing: prefills the form and saves over this project
  project?: EditableProject
}) {
  const router = useRouter()
  const [title, setTitle] = useState(project?.title ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [disciplineIds, setDisciplineIds] = useState<number[]>(project?.disciplineIds ?? [])
  const [tagIds, setTagIds] = useState<number[]>(project?.tagIds ?? [])
  const [disciplineOptions, setDisciplineOptions] = useState<Option[]>([])
  const [tagOptions, setTagOptions] = useState<Option[]>([])
  const [communityId, setCommunityId] = useState(project?.communityId ?? communities[0]?.id ?? '')
  const [existingMedia, setExistingMedia] = useState<MediaItem[]>(project?.media ?? [])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const mediaCount = existingMedia.length + imageFiles.length
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('disciplines').select('id, name').order('name').then(({ data }) => setDisciplineOptions(data ?? []))
    supabase.from('tags').select('id, name').order('name').then(({ data }) => setTagOptions(data ?? []))
  }, [])

  async function saveEdits(supabase: ReturnType<typeof createClient>, media: MediaItem[], uploadedPaths: string[]) {
    if (!project) return

    const { data: updated, error } = await supabase
      .from('projects')
      .update({
        community_id: communityId,
        title: title.trim(),
        description: description.trim(),
        media,
      })
      .eq('id', project.id)
      .select('id')

    // RLS turns a disallowed update into zero rows rather than an error
    const updateError = error ?? (updated?.length ? null : { message: 'You can only edit your own projects.' })
    if (updateError) {
      await supabase.storage.from(MEDIA_BUCKET).remove(uploadedPaths)
      setSaving(false)
      setError(updateError.message)
      return
    }

    // Only touch the rows that changed. Inserts ignore duplicates so a retry
    // after a partial failure doesn't trip over rows that already made it in.
    const removedDisciplines = onlyIn(project.disciplineIds, disciplineIds)
    const addedDisciplines = onlyIn(disciplineIds, project.disciplineIds)
    const removedTags = onlyIn(project.tagIds, tagIds)
    const addedTags = onlyIn(tagIds, project.tagIds)
    const results = await Promise.all([
      removedDisciplines.length > 0
        ? supabase.from('project_discipline').delete().eq('project_id', project.id).in('discipline_id', removedDisciplines)
        : { error: null },
      addedDisciplines.length > 0
        ? supabase
            .from('project_discipline')
            .upsert(
              addedDisciplines.map((discipline_id) => ({ project_id: project.id, discipline_id })),
              { ignoreDuplicates: true },
            )
        : { error: null },
      removedTags.length > 0
        ? supabase.from('project_tag').delete().eq('project_id', project.id).in('tag_id', removedTags)
        : { error: null },
      addedTags.length > 0
        ? supabase
            .from('project_tag')
            .upsert(addedTags.map((tag_id) => ({ project_id: project.id, tag_id })), { ignoreDuplicates: true })
        : { error: null },
    ])

    const joinError = results.find((result) => result.error)?.error
    if (joinError) {
      // The project itself saved, so keep the new uploads it now points to
      setSaving(false)
      setError(`Saved the project, but not all disciplines and tags: ${joinError.message}`)
      return
    }

    // Clean up files for images that were removed from the project
    const removedPaths = project.media
      .filter((item) => !existingMedia.some((kept) => kept.url === item.url))
      .flatMap((item) => mediaPath(item.url) ?? [])
    if (removedPaths.length > 0) await supabase.storage.from(MEDIA_BUCKET).remove(removedPaths)

    setSaving(false)
    router.push(redirectTo)
    router.refresh()
  }

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
      setError(`You must be logged in to ${project ? 'edit' : 'create'} a project.`)
      return
    }

    const uploadedPaths: string[] = []
    const media: MediaItem[] = [...existingMedia]

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

    if (project) {
      await saveEdits(supabase, media, uploadedPaths)
      return
    }

    const { data: created, error } = await supabase
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
            .insert(disciplineIds.map((discipline_id) => ({ project_id: created.id, discipline_id })))
        : { error: null },
      tagIds.length > 0
        ? supabase.from('project_tag').insert(tagIds.map((tag_id) => ({ project_id: created.id, tag_id })))
        : { error: null },
    ])

    const joinError = disciplineError ?? tagError
    if (joinError) {
      // Undo the whole save so a retry doesn't leave a duplicate project behind
      await supabase.from('project_discipline').delete().eq('project_id', created.id)
      await supabase.from('project_tag').delete().eq('project_id', created.id)
      await supabase.from('projects').delete().eq('id', created.id)
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

  if (communities.length === 0 && !project) {
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
      {!embedded && <h1>{project ? 'Edit project' : 'Create new project'}</h1>}
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
          {existingMedia.map((item) => (
            <div key={item.url} className={styles.mediaRow}>
              {isVideo(item) ? (
                <video src={item.url} width={60} height={60} style={{ objectFit: 'cover' }} muted preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="" width={60} height={60} style={{ objectFit: 'cover' }} />
              )}
              <span>Current {isVideo(item) ? 'video' : 'image'}</span>
              <button
                type="button"
                className={styles.button}
                onClick={() => setExistingMedia((prev) => prev.filter((kept) => kept.url !== item.url))}
              >
                Remove
              </button>
            </div>
          ))}
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
          {mediaCount < MAX_MEDIA && (
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                const picked = Array.from(event.target.files ?? [])
                setImageFiles((prev) => [...prev, ...picked].slice(0, MAX_MEDIA - existingMedia.length))
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

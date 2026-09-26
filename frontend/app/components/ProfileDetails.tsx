'use client'

import { useEffect, useRef, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { escapeLike } from '@/lib/search'
import ResumePreview from './ResumePreview'
import styles from '../pages/Profile.module.css'

export type ProfileRow = {
  id: string
  full_name: string | null
  school: string | null
  major: string | null
  grad_year: number | null
  bio: string | null
  avatar_url: string | null
  background_url: string | null
  resume_path: string | null
  created_at: string
}

export type Skill = {
  id: number
  name: string
}

type EditableField = 'full_name' | 'school' | 'major' | 'grad_year' | 'bio'

const editableFields: { key: EditableField; label: string }[] = [
  { key: 'full_name', label: 'Full Name' },
  { key: 'school', label: 'School' },
  { key: 'major', label: 'Major' },
  { key: 'grad_year', label: 'Grad Year' },
  { key: 'bio', label: 'Bio' },
]

const SKILL_RESULT_LIMIT = 50
const SKILL_SEARCH_DELAY_MS = 250

type UploadKind = 'avatar' | 'background' | 'resume'
type UploadColumn = 'avatar_url' | 'background_url' | 'resume_path'

const IMAGE_TYPES = {
  types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  description: 'a JPEG, PNG, WebP, or GIF image',
}

// Keep in sync with the bucket settings in Supabase Storage
const uploads: Record<
  UploadKind,
  {
    column: UploadColumn
    bucket: string
    label: string
    maxMb: number
    accept: typeof IMAGE_TYPES
    // Whether the column holds the public URL or the path inside the bucket
    stores: 'url' | 'path'
  }
> = {
  avatar: {
    column: 'avatar_url',
    bucket: 'avatars',
    label: 'Profile Picture',
    maxMb: 5,
    accept: IMAGE_TYPES,
    stores: 'url',
  },
  background: {
    column: 'background_url',
    bucket: 'backgrounds',
    label: 'Background Image',
    maxMb: 10,
    accept: IMAGE_TYPES,
    stores: 'url',
  },
  resume: {
    column: 'resume_path',
    bucket: 'resumes',
    label: 'Resume',
    maxMb: 10,
    accept: {
      types: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      extensions: ['.pdf', '.docx'],
      description: 'a PDF or Word (.docx) file',
    },
    stores: 'path',
  },
}

const uploadKinds = Object.keys(uploads) as UploadKind[]

const noUploads: Record<UploadKind, null> = { avatar: null, background: null, resume: null }

function fileExtension(name: string) {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot).toLowerCase() : ''
}

// Some systems report an empty type for .docx files, so fall back to the extension
function isAccepted(kind: UploadKind, file: File) {
  const { types, extensions } = uploads[kind].accept
  return types.includes(file.type) || (!file.type && extensions.includes(fileExtension(file.name)))
}

// The bucket's content type for the upload, even when the browser didn't report one
function contentType(kind: UploadKind, file: File) {
  const { types, extensions } = uploads[kind].accept
  return file.type || types[extensions.indexOf(fileExtension(file.name))] || types[0]
}

function toFormValues(profile: ProfileRow): Record<EditableField, string> {
  return {
    full_name: profile.full_name ?? '',
    school: profile.school ?? '',
    major: profile.major ?? '',
    grad_year: profile.grad_year?.toString() ?? '',
    bio: profile.bio ?? '',
  }
}

// A new name per upload, so browsers don't keep showing a cached old file
function newUploadPath(profileId: string, file: File) {
  return `${profileId}/${Date.now()}${fileExtension(file.name)}`
}

// Returns the file's path inside the bucket, or null for URLs outside it
function storagePath(kind: UploadKind, value: string | null) {
  const { bucket, stores } = uploads[kind]
  if (!value) return null
  if (stores === 'path') return value

  const marker = `/storage/v1/object/public/${bucket}/`
  const index = value.indexOf(marker)
  return index >= 0 ? decodeURIComponent(value.slice(index + marker.length)) : null
}

export default function ProfileDetails({
  profile,
  skills,
  isOwnProfile,
}: {
  profile: ProfileRow
  skills: Skill[]
  isOwnProfile: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState(() => toFormValues(profile))
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>(skills)
  const [skillQuery, setSkillQuery] = useState('')
  const [skillResults, setSkillResults] = useState<Skill[]>([])
  const [searchingSkills, setSearchingSkills] = useState(false)
  const [showSkillResults, setShowSkillResults] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<Record<UploadKind, File | null>>(noUploads)
  const [imagePreviews, setImagePreviews] = useState<Record<UploadKind, string | null>>(noUploads)
  const [removeResume, setRemoveResume] = useState(false)
  const skillPickerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!editing) return

    let cancelled = false
    const term = skillQuery.trim()

    const timeout = setTimeout(async () => {
      setSearchingSkills(true)
      const supabase = createClient()
      let request = supabase
        .from('skills')
        .select('id, name')
        .eq('is_approved', true)
        .order('name')
        .limit(SKILL_RESULT_LIMIT)
      if (term) request = request.ilike('name', `%${escapeLike(term)}%`)

      const { data, error } = await request
      if (cancelled) return
      setSearchingSkills(false)

      if (error) {
        setError(error.message)
        return
      }
      setSkillResults(data ?? [])
    }, term ? SKILL_SEARCH_DELAY_MS : 0)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [editing, skillQuery])

  useEffect(() => {
    if (!showSkillResults) return

    // Pointer clicks, not blur: Safari doesn't focus checkboxes on click,
    // so a blur check would close the results when picking a skill
    function handlePointerDown(event: PointerEvent) {
      if (!skillPickerRef.current?.contains(event.target as Node)) {
        setShowSkillResults(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [showSkillResults])

  const selectedSkillIds = new Set(selectedSkills.map((skill) => skill.id))

  function toggleSkill(skill: Skill) {
    setSelectedSkills((prev) =>
      selectedSkillIds.has(skill.id)
        ? prev.filter((s) => s.id !== skill.id)
        : [...prev, skill].sort((a, b) => a.name.localeCompare(b.name))
    )
  }

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

    const uploaded: { kind: UploadKind; path: string }[] = []
    const newFileValues: Partial<Record<UploadColumn, string | null>> = {}

    async function removeUploaded() {
      for (const { kind, path } of uploaded) {
        await supabase.storage.from(uploads[kind].bucket).remove([path])
      }
    }

    for (const kind of uploadKinds) {
      const file = uploadFiles[kind]
      if (!file) continue

      const { bucket, column, stores } = uploads[kind]
      const path = newUploadPath(profile.id, file)
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { contentType: contentType(kind, file) })
      if (error) {
        await removeUploaded()
        setSaving(false)
        setError(error.message)
        return
      }
      uploaded.push({ kind, path })
      newFileValues[column] =
        stores === 'path' ? path : supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
    }

    const resumeRemoved = removeResume && !uploadFiles.resume && Boolean(profile.resume_path)
    if (resumeRemoved) newFileValues.resume_path = null

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: values.full_name.trim(),
        school: values.school.trim() || null,
        major: values.major.trim() || null,
        grad_year: gradYear ? Number(gradYear) : null,
        bio: values.bio.trim() || null,
        ...newFileValues,
      })
      .eq('id', profile.id)

    if (error) {
      await removeUploaded()
      setSaving(false)
      setError(error.message)
      return
    }

    // Best effort: the profile no longer points at these files, so a failed cleanup
    // isn't shown as an error
    const replacedKinds: UploadKind[] = uploaded.map(({ kind }) => kind)
    if (resumeRemoved) replacedKinds.push('resume')
    for (const kind of replacedKinds) {
      const oldPath = storagePath(kind, profile[uploads[kind].column])
      if (oldPath) await supabase.storage.from(uploads[kind].bucket).remove([oldPath])
    }

    const removedSkillIds = skills.map((s) => s.id).filter((id) => !selectedSkillIds.has(id))
    if (removedSkillIds.length > 0) {
      const { error } = await supabase
        .from('profile_skills')
        .delete()
        .eq('profile_id', profile.id)
        .in('skill_id', removedSkillIds)
      if (error) {
        setSaving(false)
        setError(error.message)
        return
      }
    }

    if (selectedSkills.length > 0) {
      const { error } = await supabase
        .from('profile_skills')
        .upsert(
          selectedSkills.map((skill) => ({ profile_id: profile.id, skill_id: skill.id })),
          { onConflict: 'profile_id,skill_id', ignoreDuplicates: true }
        )
      if (error) {
        setSaving(false)
        setError(error.message)
        return
      }
    }

    setSaving(false)
    setEditing(false)
    clearUploads()
    router.refresh()
  }

  function handleEdit() {
    setValues(toFormValues(profile))
    setSelectedSkills(skills)
    setSkillQuery('')
    setShowSkillResults(false)
    clearUploads()
    setError(null)
    setEditing(true)
  }

  function handleCancel() {
    setEditing(false)
    clearUploads()
    setError(null)
  }

  function setUpload(kind: UploadKind, file: File | null) {
    setUploadFiles((prev) => ({ ...prev, [kind]: file }))
    if (uploads[kind].accept !== IMAGE_TYPES) return
    setImagePreviews((prev) => {
      if (prev[kind]) URL.revokeObjectURL(prev[kind])
      return { ...prev, [kind]: file ? URL.createObjectURL(file) : null }
    })
  }

  function clearUploads() {
    for (const kind of uploadKinds) setUpload(kind, null)
    setRemoveResume(false)
  }

  // Returns false when the file is rejected; the selection is cleared in that case
  function handleUploadChange(kind: UploadKind, file: File | null) {
    const { label, maxMb, accept } = uploads[kind]
    let problem: string | null = null
    if (file && !isAccepted(kind, file)) {
      problem = `${label} must be ${accept.description}.`
    } else if (file && file.size > maxMb * 1024 * 1024) {
      problem = `${label} must be ${maxMb} MB or smaller.`
    }

    setError(problem)
    setUpload(kind, problem ? null : file)
    if (kind === 'resume' && file && !problem) setRemoveResume(false)
    return !problem
  }

  const details = (
    <dl className={styles.details}>
      <dt>ID</dt>
      <dd>{profile.id}</dd>
      {editing &&
        uploadKinds.map((kind) => (
          <div key={kind} className={styles.row}>
            <dt>
              <label htmlFor={kind}>{uploads[kind].label}</label>
            </dt>
            <dd className={styles.imageField}>
              {imagePreviews[kind] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreviews[kind]}
                  alt={`New ${uploads[kind].label.toLowerCase()} preview`}
                  className={kind === 'avatar' ? styles.avatarPreview : styles.backgroundPreview}
                />
              )}
              <input
                id={kind}
                type="file"
                accept={[...uploads[kind].accept.types, ...uploads[kind].accept.extensions].join(',')}
                onChange={(event) => {
                  // Clear rejected files so the input matches what will be saved
                  const file = event.target.files?.[0] ?? null
                  if (!handleUploadChange(kind, file)) event.target.value = ''
                }}
              />
              {kind === 'resume' && profile.resume_path && !uploadFiles.resume && (
                <label>
                  <input
                    type="checkbox"
                    checked={removeResume}
                    onChange={(event) => setRemoveResume(event.target.checked)}
                  />
                  Remove current resume
                </label>
              )}
            </dd>
          </div>
        ))}
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

  const shownSkills = editing ? selectedSkills : skills

  const skillsSection = (
    <section className={styles.section}>
      <h2>Skills</h2>
      {shownSkills.length > 0 ? (
        <ul className={styles.chips} aria-label={editing ? 'Selected skills' : undefined}>
          {shownSkills.map((skill) => (
            <li key={skill.id} className={styles.chip}>
              {skill.name}
              {editing && (
                <button
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  aria-label={`Remove ${skill.name}`}
                  className={styles.chipRemove}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>{editing ? 'No skills selected.' : 'No skills added yet.'}</p>
      )}
      {editing && (
        <div
          ref={skillPickerRef}
          className={styles.skillPicker}
          // Keyboard users tabbing out of the picker should also close the results
          onBlur={(event) => {
            const next = event.relatedTarget
            if (next && !event.currentTarget.contains(next)) setShowSkillResults(false)
          }}
        >
          <label htmlFor="skill-search">Search skills</label>
          <input
            id="skill-search"
            type="search"
            placeholder="e.g. Python"
            value={skillQuery}
            onChange={(event) => {
              setSkillQuery(event.target.value)
              setShowSkillResults(true)
            }}
            onFocus={() => setShowSkillResults(true)}
            onKeyDown={(event) => {
              // Enter would otherwise submit the whole profile form
              if (event.key === 'Enter') event.preventDefault()
              if (event.key === 'Escape') setShowSkillResults(false)
            }}
            autoComplete="off"
          />
          {showSkillResults && (
            <ul className={styles.skillResults} aria-busy={searchingSkills}>
              {skillResults.map((skill) => (
                <li key={skill.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedSkillIds.has(skill.id)}
                      onChange={() => toggleSkill(skill)}
                    />
                    {skill.name}
                  </label>
                </li>
              ))}
              {!searchingSkills && skillResults.length === 0 && <li>No matching skills.</li>}
            </ul>
          )}
        </div>
      )}
    </section>
  )

  const resumeName = profile.full_name ? `${profile.full_name}'s resume` : 'Resume'

  if (!editing) {
    return (
      <>
        {details}
        {skillsSection}
        <section className={styles.section}>
          <h2>Resume</h2>
          {profile.resume_path ? (
            <ResumePreview
              url={
                createClient().storage.from(uploads.resume.bucket).getPublicUrl(profile.resume_path)
                  .data.publicUrl
              }
              name={resumeName}
            />
          ) : (
            <p>No resume added yet.</p>
          )}
        </section>
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
      {skillsSection}
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

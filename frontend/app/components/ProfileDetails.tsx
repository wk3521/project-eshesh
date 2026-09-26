'use client'

import { useEffect, useRef, useState, FormEvent } from 'react'
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

export type Skill = {
  id: number
  name: string
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

const SKILL_RESULT_LIMIT = 50
const SKILL_SEARCH_DELAY_MS = 250

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

// Escape ilike wildcards so "%" and "_" in the search are matched literally
function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
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

    if (error) {
      setSaving(false)
      setError(error.message)
      return
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
    router.refresh()
  }

  function handleEdit() {
    setValues(toFormValues(profile))
    setSelectedSkills(skills)
    setSkillQuery('')
    setShowSkillResults(false)
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

  const shownSkills = editing ? selectedSkills : skills

  const skillsSection = (
    <section className={styles.skills}>
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

  if (!editing) {
    return (
      <>
        {details}
        {skillsSection}
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

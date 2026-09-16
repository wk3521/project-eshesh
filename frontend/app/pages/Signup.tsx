'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { signUpNewUser } from '@/app/auth'
import styles from './Signup.module.css'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [school, setSchool] = useState('')
  const [major, setMajor] = useState('')
  const [gradYear, setGradYear] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signUpNewUser(email, password, {
      firstName,
      lastName,
      school,
      major,
      gradYear,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess(true)
  }

  if (success) {
    return <p>Account created! Check your email to confirm before logging in.</p>
  }

  return (
    <>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="firstName">First Name</label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="lastName">Last Name</label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            pattern=".+@.+\.edu"
            title="Please use a valid .edu email address"
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            title="Password must be at least 8 characters"
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="school">School</label>
          <input
            id="school"
            type="text"
            value={school}
            onChange={(event) => setSchool(event.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="major">Major</label>
          <input
            id="major"
            type="text"
            value={major}
            onChange={(event) => setMajor(event.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="gradYear">Grad Year</label>
          <input
            id="gradYear"
            type="number"
            value={gradYear}
            onChange={(event) => setGradYear(event.target.value)}
            required
          />
        </div>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className={styles.button}>
          {loading ? 'Signing up...' : 'Sign up'}
        </button>
      </form>
      <Link href="/login" className={styles.switchLink}>
        Already have an account? Login
      </Link>
    </>
  )
}

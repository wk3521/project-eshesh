'use client'

import { useEffect, useRef, useState } from 'react'
import styles from '../pages/Profile.module.css'

export default function ResumePreview({ url, name }: { url: string; name: string }) {
  const isPdf = url.toLowerCase().split('?')[0].endsWith('.pdf')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const fullRef = useRef<HTMLDivElement>(null)
  const [docx, setDocx] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Browsers render PDFs natively; DOCX has to be fetched and rendered to HTML
  useEffect(() => {
    if (isPdf) return

    let cancelled = false
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Couldn't load resume (${response.status}).`)
        return response.blob()
      })
      .then((blob) => {
        if (!cancelled) setDocx(blob)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [url, isPdf])

  useEffect(() => {
    if (!docx) return

    let cancelled = false
    // Loaded on demand so profiles without a DOCX resume don't download the renderer
    import('docx-preview').then(async ({ renderAsync }) => {
      for (const container of [previewRef.current, fullRef.current]) {
        if (cancelled || !container) continue
        container.replaceChildren()
        await renderAsync(docx, container, undefined, { className: 'docx', inWrapper: true })
      }
    }).catch(() => {
      if (!cancelled) setError("Couldn't display this resume.")
    })

    return () => {
      cancelled = true
    }
  }, [docx])

  function open() {
    dialogRef.current?.showModal()
  }

  function close() {
    dialogRef.current?.close()
  }

  if (error) {
    return (
      <p>
        {error}{' '}
        <a href={url} target="_blank" rel="noreferrer">
          Download resume
        </a>
      </p>
    )
  }

  return (
    <>
      <div className={styles.resumeCard}>
        {isPdf ? (
          <iframe
            src={`${url}#toolbar=0&navpanes=0&view=FitH`}
            title={`${name} preview`}
            className={styles.resumePreviewFrame}
            tabIndex={-1}
          />
        ) : (
          <div ref={previewRef} className={styles.resumePreviewDocx} />
        )}
        {/* Covers the preview so clicks open the dialog instead of scrolling the frame */}
        <button
          type="button"
          onClick={open}
          className={styles.resumeCardButton}
          aria-label={`Open ${name}`}
        />
      </div>

      <dialog
        ref={dialogRef}
        className={styles.resumeDialog}
        aria-label={name}
        // Clicks on the backdrop land on the dialog element itself
        onClick={(event) => {
          if (event.target === event.currentTarget) close()
        }}
      >
        <div className={styles.resumeDialogBar}>
          <a href={url} target="_blank" rel="noreferrer">
            Download
          </a>
          <button type="button" onClick={close} className={styles.button}>
            Close
          </button>
        </div>
        {isPdf ? (
          <iframe src={url} title={name} className={styles.resumeFullFrame} />
        ) : (
          <div ref={fullRef} className={styles.resumeFullDocx} />
        )}
      </dialog>
    </>
  )
}

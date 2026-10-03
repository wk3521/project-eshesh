'use client'

import { useState } from 'react'
import { isVideo, type MediaItem } from '@/lib/media'

export default function ImageCarousel({ media }: { media: MediaItem[] }) {
  const [index, setIndex] = useState(0)

  if (media.length === 0) return null

  const item = media[index]

  return (
    <div className="relative">
      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900">
        {isVideo(item) ? (
          <video src={item.url} className="h-full w-full object-cover" controls />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      {media.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + media.length) % media.length)}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-1 text-white hover:bg-black/70"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % media.length)}
            aria-label="Next image"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-1 text-white hover:bg-black/70"
          >
            ›
          </button>
          <div className="mt-2 flex justify-center gap-1.5">
            {media.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to image ${i + 1}`}
                className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-neutral-800 dark:bg-neutral-200' : 'bg-neutral-300 dark:bg-neutral-700'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

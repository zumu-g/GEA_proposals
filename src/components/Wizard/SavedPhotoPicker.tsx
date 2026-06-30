'use client'

import { useEffect, useState, useCallback } from 'react'

export interface SavedImage {
  filename: string
  url: string
  originalName?: string
  createdAt?: string
}

/** Upload a hero image to the durable store; returns its served URL (or throws). */
export async function uploadHeroImage(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  const data = await res.json()
  if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed')
  return data.url as string
}

/**
 * "Reuse a saved photo" picker — a button that opens a grid of previously
 * uploaded hero photos. Selecting one calls onSelect with its served URL.
 */
/** How many thumbnails to show inline before the "show all" grid is needed. */
const PREVIEW_COUNT = 6

export function SavedPhotoPicker({ onSelect }: { onSelect: (url: string) => void }) {
  const [open, setOpen] = useState(false)
  const [images, setImages] = useState<SavedImage[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/upload')
      const data = await res.json()
      setImages(Array.isArray(data.images) ? data.images : [])
    } catch {
      setImages([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Load on mount so the saved photos are visible as thumbnails without the
  // user having to open a panel first.
  useEffect(() => {
    load()
  }, [load])

  const select = useCallback((url: string) => {
    onSelect(url)
    setOpen(false)
  }, [onSelect])

  if (loading) {
    return <p className="mt-3 text-xs font-sans text-gray-400">loading saved photos…</p>
  }

  // Nothing in the library yet — stay quiet rather than showing an empty control.
  if (images.length === 0) return null

  const preview = images.slice(0, PREVIEW_COUNT)
  const extra = images.length - preview.length

  return (
    <div className="mt-3">
      <p className="text-xs font-sans text-gray-500 mb-2 flex items-center gap-1.5">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M18 5.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
        </svg>
        reuse a saved photo
      </p>

      {/* Inline thumbnail strip — shows at a glance what can be selected. */}
      <div className="flex flex-wrap items-center gap-2">
        {preview.map((img) => (
          <button
            key={img.filename}
            type="button"
            onClick={() => select(img.url)}
            className="group relative w-14 h-11 rounded-md overflow-hidden border border-gray-200 hover:border-[#C41E2A] transition-colors"
            title={img.originalName || img.filename}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.originalName || ''} className="w-full h-full object-cover" />
          </button>
        ))}

        {extra > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-14 h-11 rounded-md border border-dashed border-gray-300 text-xs font-sans text-gray-500 hover:border-[#C41E2A] hover:text-gray-700 transition-colors"
          >
            {open ? 'hide' : `+${extra}`}
          </button>
        )}
      </div>

      {/* Full grid for browsing the whole library. */}
      {open && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {images.map((img) => (
              <button
                key={img.filename}
                type="button"
                onClick={() => select(img.url)}
                className="group relative aspect-[4/3] rounded-md overflow-hidden border border-gray-200 hover:border-[#C41E2A] transition-colors"
                title={img.originalName || img.filename}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.originalName || ''} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

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
export function SavedPhotoPicker({ onSelect }: { onSelect: (url: string) => void }) {
  const [open, setOpen] = useState(false)
  const [images, setImages] = useState<SavedImage[]>([])
  const [loading, setLoading] = useState(false)

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

  useEffect(() => {
    if (open) load()
  }, [open, load])

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-sans text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1.5"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M18 5.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
        </svg>
        {open ? 'hide saved photos' : 'reuse a saved photo'}
      </button>

      {open && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          {loading ? (
            <p className="text-xs font-sans text-gray-400 py-4 text-center">loading saved photos…</p>
          ) : images.length === 0 ? (
            <p className="text-xs font-sans text-gray-400 py-4 text-center">no saved photos yet — upload one to start your library</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
              {images.map((img) => (
                <button
                  key={img.filename}
                  type="button"
                  onClick={() => {
                    onSelect(img.url)
                    setOpen(false)
                  }}
                  className="group relative aspect-[4/3] rounded-md overflow-hidden border border-gray-200 hover:border-[#C41E2A] transition-colors"
                  title={img.originalName || img.filename}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.originalName || ''} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

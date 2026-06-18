import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { uploadsDir } from '@/lib/db'

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

// GET /api/uploads/[filename] — serve an uploaded image from the durable volume.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params

  // Guard against path traversal — only a bare filename is allowed.
  if (!filename || filename.includes('/') || filename.includes('..') || path.basename(filename) !== filename) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  try {
    const buffer = await fs.readFile(path.join(uploadsDir(), filename))
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    const contentType = MIME_BY_EXT[ext] || 'application/octet-stream'
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { getDb, uploadsDir } from '@/lib/db'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// POST /api/upload  (multipart: file)
// Persists an uploaded image to the durable volume and records it in
// uploaded_images so it can be reused across proposals. Returns its served URL.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file || !file.name || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum 10MB.' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF.' },
        { status: 400 }
      )
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const hash = crypto.randomBytes(8).toString('hex')
    const filename = `${hash}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(path.join(uploadsDir(), filename), buffer)

    const url = `/api/uploads/${filename}`

    getDb()
      .prepare(
        `INSERT INTO uploaded_images (filename, url, original_name, mime, size)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(filename, url, file.name, file.type, file.size)

    return NextResponse.json({ success: true, url, filename })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

// GET /api/upload — list previously uploaded images for the reuse picker.
export async function GET() {
  try {
    const rows = getDb()
      .prepare(
        `SELECT filename, url, original_name AS originalName, created_at AS createdAt
         FROM uploaded_images ORDER BY created_at DESC LIMIT 200`
      )
      .all()
    return NextResponse.json({ images: rows })
  } catch (error) {
    console.error('Upload list error:', error)
    return NextResponse.json({ images: [] })
  }
}

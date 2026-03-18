import { NextResponse } from 'next/server'
import { lookupPropertyImages } from '@/lib/property-image-lookup'

// GET /api/property-images?address=42+Smith+St+Brighton+VIC+3186
// Returns { heroImage, galleryImages, source }
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'address parameter required' }, { status: 400 })
  }

  try {
    const images = await lookupPropertyImages(address)
    return NextResponse.json(images)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Image lookup failed' },
      { status: 500 }
    )
  }
}

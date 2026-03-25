import { NextResponse } from 'next/server'
import { geocodeAddress } from '@/lib/geocoding'

// GET /api/geocode?address=12+Collins+Cres,+Berwick+VIC+3806
// Returns { lat, lng } for the given address using Nominatim (OpenStreetMap)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')

  if (!address || address.trim().length < 5) {
    return NextResponse.json(
      { error: 'Address must be at least 5 characters', lat: null, lng: null },
      { status: 400 },
    )
  }

  try {
    const result = await geocodeAddress(address)

    if (!result) {
      return NextResponse.json({ lat: null, lng: null })
    }

    return NextResponse.json({ lat: result.lat, lng: result.lng })
  } catch (err) {
    console.error('[api/geocode] Error:', err)
    return NextResponse.json({ lat: null, lng: null })
  }
}

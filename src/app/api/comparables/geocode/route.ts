import { NextResponse } from 'next/server'
import { parseAddress, NEIGHBORING_SUBURBS } from '@/lib/comparables-lookup'
import { backfillSoldCoords } from '@/lib/geocode-backfill'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 160 // geocoding is rate-limited to 1 req/s

// POST /api/comparables/geocode  { address: "34 Allunga Pde, Berwick VIC 3806" }
// Backfills real per-property coordinates for sold comps in the subject's
// suburb (+ neighbours) so distances are measured to each comp's true location.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const input = body.address || body.suburb || ''
  if (!input) {
    return NextResponse.json({ error: 'address parameter required' }, { status: 400 })
  }

  const parts = parseAddress(input)
  if (!parts?.suburb) {
    return NextResponse.json({ error: `Could not parse: ${input}` }, { status: 400 })
  }

  const suburb = parts.suburb.toLowerCase()
  const suburbs = [suburb, ...(NEIGHBORING_SUBURBS[suburb] || [])]
  const limit = Math.min(Number(body.limit) || 40, 80)

  try {
    const result = await backfillSoldCoords(suburbs, limit, suburb)
    return NextResponse.json({ suburb, ...result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Geocode backfill failed' },
      { status: 500 }
    )
  }
}

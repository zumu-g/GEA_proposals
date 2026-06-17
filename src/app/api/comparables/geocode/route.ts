import { NextResponse } from 'next/server'
import { parseAddress, NEIGHBORING_SUBURBS } from '@/lib/comparables-lookup'
import { backfillSoldCoords, backfillLeasedCoords } from '@/lib/geocode-backfill'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 160 // geocoding is rate-limited to 1 req/s

// POST /api/comparables/geocode  { address: "34 Allunga Pde, Berwick VIC 3806", type?: "sold" | "leased" }
// Backfills real per-property coordinates for comps in the subject's suburb
// (+ neighbours) so distances are measured to each comp's true location.
// type defaults to "sold"; pass "leased" to backfill rental comparables.
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
  const type = body.type === 'leased' ? 'leased' : 'sold'

  try {
    const result = type === 'leased'
      ? await backfillLeasedCoords(suburbs, limit, suburb)
      : await backfillSoldCoords(suburbs, limit, suburb)
    return NextResponse.json({ suburb, type, ...result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Geocode backfill failed' },
      { status: 500 }
    )
  }
}

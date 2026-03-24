import { NextResponse } from 'next/server'
import { suggestAddresses } from '@/lib/address-suggest'

// GET /api/address-suggest?q=17+Rose+Garden
// Returns address autocomplete suggestions from realestate.com.au
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query || query.trim().length < 3) {
    return NextResponse.json(
      { suggestions: [], error: 'Query must be at least 3 characters' },
      { status: 400 },
    )
  }

  try {
    const suggestions = await suggestAddresses(query)
    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error('[api/address-suggest] Error:', err)
    return NextResponse.json({ suggestions: [] })
  }
}

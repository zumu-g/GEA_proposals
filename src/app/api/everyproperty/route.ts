import { NextResponse } from 'next/server'
import { getProposalData, suggestAddresses } from '@/lib/everyproperty'

// The everypropertyai CLI runs server-side. A `proposal` lookup can take ~120s for
// an uncached address, so allow a generous duration and force dynamic execution.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 160

// GET /api/everyproperty?q=<query>          → { suggestions } (address search)
// GET /api/everyproperty?address=<address>  → ProposalPropertyData (full lookup)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const address = searchParams.get('address')

  try {
    if (query) {
      const suggestions = await suggestAddresses(query)
      return NextResponse.json({ suggestions })
    }
    if (address) {
      const data = await getProposalData(address)
      return NextResponse.json(data)
    }
    return NextResponse.json({ error: 'q or address parameter required' }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'everyproperty lookup failed' },
      { status: 502 }
    )
  }
}

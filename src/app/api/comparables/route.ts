import { NextResponse } from 'next/server'
import { getComparablesForAddress } from '@/lib/everyproperty'
import { getProposal, saveProposal, logActivity } from '@/lib/proposal-generator'

// All property data comes live from the everypropertyAI HTTP API — the app
// keeps no local property database. Empty results return 200 with sales: []
// so the wizard renders its empty state instead of erroring.

type CompType = 'sold' | 'buy' | 'leased' | 'rent'

// GET /api/comparables?address=42+Smith+St,+Berwick+VIC+3806&type=sold|buy|leased|rent
// `refresh=true` is accepted for backward compatibility — every request is a
// live fetch, so refresh is a no-op.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')
  if (!address) {
    return NextResponse.json({ error: 'address parameter required' }, { status: 400 })
  }

  const type = (searchParams.get('type') as CompType) || 'sold'

  try {
    const sales = await getComparablesForAddress(address, type)
    return NextResponse.json({
      address,
      type,
      count: sales.length,
      sales,
      source: 'everypropertyai',
      cached: false,
    })
  } catch (error) {
    // everyproperty.getComparables already swallows per-suburb errors; this
    // catch guards the unexpected. Empty 200 keeps the wizard's empty state.
    console.error('[api/comparables] lookup failed:', error)
    return NextResponse.json({
      address,
      type,
      count: 0,
      sales: [],
      source: 'everypropertyai',
      cached: false,
      error: error instanceof Error ? error.message : 'Lookup failed',
    })
  }
}

// POST /api/comparables — look up and save comparables to a proposal
// Body: { proposalId: "xxx" } or { proposalId: "xxx", address: "override address" }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { proposalId, address: overrideAddress } = body

    if (!proposalId) {
      return NextResponse.json({ error: 'proposalId required' }, { status: 400 })
    }

    const proposal = await getProposal(proposalId)
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    const address = overrideAddress || proposal.propertyAddress

    const [sales, onMarket] = await Promise.all([
      getComparablesForAddress(address, 'sold'),
      getComparablesForAddress(address, 'buy'),
    ])

    if (sales.length > 0) proposal.recentSales = sales as any
    if (onMarket.length > 0) proposal.onMarketListings = onMarket as any
    if (sales.length > 0 || onMarket.length > 0) {
      await saveProposal(proposal)
      logActivity(
        proposalId,
        'comparables_updated',
        `Found ${sales.length} sold + ${onMarket.length} on-market from everypropertyAI`
      )
    }

    return NextResponse.json({
      success: true,
      proposalId,
      address,
      source: 'everypropertyai',
      cached: false,
      sold: { count: sales.length, sales },
      onMarket: { count: onMarket.length, listings: onMarket },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update comparables' },
      { status: 500 }
    )
  }
}

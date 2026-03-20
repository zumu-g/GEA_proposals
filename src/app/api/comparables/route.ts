import { NextResponse } from 'next/server'
import { lookupComparables, lookupOnMarket } from '@/lib/comparables-lookup'
import { isApifyAvailable } from '@/lib/apify-scraper'
import { getProposal, saveProposal, logActivity } from '@/lib/proposal-generator'

// GET /api/comparables?address=42+Smith+St,+Brighton+VIC+3186
// Look up comparable sales for an address (preview, doesn't save)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'address parameter required' }, { status: 400 })
  }

  const type = searchParams.get('type')

  try {
    if (type === 'buy') {
      const listings = await lookupOnMarket(address)
      return NextResponse.json({ address, count: listings.length, sales: listings, source: isApifyAvailable() ? 'apify' : 'homely' })
    }
    const sales = await lookupComparables(address)
    return NextResponse.json({ address, count: sales.length, sales, source: isApifyAvailable() ? 'apify' : 'homely' })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Lookup failed' },
      { status: 500 }
    )
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
    const source = isApifyAvailable() ? 'apify (realestate.com.au)' : 'homely.com.au'

    // Fetch both sold and on-market in parallel
    const [sales, onMarket] = await Promise.all([
      lookupComparables(address),
      lookupOnMarket(address),
    ])

    if (sales.length > 0) {
      proposal.recentSales = sales
    }
    if (onMarket.length > 0) {
      proposal.onMarketListings = onMarket
    }
    if (sales.length > 0 || onMarket.length > 0) {
      await saveProposal(proposal)
      logActivity(proposalId, 'comparables_updated', `Found ${sales.length} sold + ${onMarket.length} on-market from ${source}`)
    }

    return NextResponse.json({
      success: true,
      proposalId,
      address,
      source,
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

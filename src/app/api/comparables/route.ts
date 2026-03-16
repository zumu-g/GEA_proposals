import { NextResponse } from 'next/server'
import { lookupComparables } from '@/lib/comparables-lookup'
import { getProposal, saveProposal, logActivity } from '@/lib/proposal-generator'

// GET /api/comparables?address=42+Smith+St,+Brighton+VIC+3186
// Look up comparable sales for an address (preview, doesn't save)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'address parameter required' }, { status: 400 })
  }

  try {
    const sales = await lookupComparables(address)
    return NextResponse.json({ address, count: sales.length, sales })
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
    const sales = await lookupComparables(address)

    if (sales.length > 0) {
      proposal.recentSales = sales
      await saveProposal(proposal)
      logActivity(proposalId, 'comparables_updated', `Found ${sales.length} comparable sales from homely.com.au`)
    }

    return NextResponse.json({
      success: true,
      proposalId,
      address,
      count: sales.length,
      sales,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update comparables' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { lookupComparables, lookupOnMarket, searchComparables, getLastSource, SearchFilters } from '@/lib/comparables-lookup'
import { isApifyAvailable, refreshApifyData } from '@/lib/apify-scraper'
import { getProposal, saveProposal, logActivity } from '@/lib/proposal-generator'

// GET /api/comparables?address=42+Smith+St,+Brighton+VIC+3186
// Optional filter params: minPrice, maxPrice, minBedrooms, minBathrooms, minCarSpaces, propertyType, saleDateMonths, sortBy
// Optional: refresh=true to force a fresh Apify scrape (bypasses caching)
// Look up comparable sales for an address (preview, doesn't save)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'address parameter required' }, { status: 400 })
  }

  const type = (searchParams.get('type') as 'sold' | 'buy') || 'sold'
  const refresh = searchParams.get('refresh') === 'true'

  // Check if any filter params are present
  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')
  const minBedrooms = searchParams.get('minBedrooms')
  const minBathrooms = searchParams.get('minBathrooms')
  const minCarSpaces = searchParams.get('minCarSpaces')
  const propertyType = searchParams.get('propertyType')
  const saleDateMonths = searchParams.get('saleDateMonths')
  const sortBy = searchParams.get('sortBy')

  const hasFilters = minPrice || maxPrice || minBedrooms || minBathrooms || minCarSpaces || propertyType || saleDateMonths || sortBy

  try {
    // Force fresh Apify scrape if refresh=true
    if (refresh && isApifyAvailable()) {
      console.log(`[api/comparables] Refresh requested — forcing fresh Apify scrape for ${address}`)
      const freshData = await refreshApifyData(address, type)
      const source = 'apify'

      if (type === 'sold' && freshData.sold) {
        return NextResponse.json({
          address,
          type,
          count: freshData.sold.length,
          sales: freshData.sold,
          source,
          refreshed: true,
        })
      }
      if (type === 'buy' && freshData.onMarket) {
        return NextResponse.json({
          address,
          type,
          count: freshData.onMarket.length,
          sales: freshData.onMarket,
          source,
          refreshed: true,
        })
      }

      // If refresh returned nothing, fall through to normal lookup
      console.log(`[api/comparables] Refresh returned no results, falling through to normal lookup`)
    }

    // If filters are provided, use the enhanced searchComparables
    if (hasFilters) {
      const filters: SearchFilters = {}
      if (minPrice) filters.minPrice = parseInt(minPrice)
      if (maxPrice) filters.maxPrice = parseInt(maxPrice)
      if (minBedrooms) filters.minBedrooms = parseInt(minBedrooms)
      if (minBathrooms) filters.minBathrooms = parseInt(minBathrooms)
      if (minCarSpaces) filters.minCarSpaces = parseInt(minCarSpaces)
      if (propertyType) filters.propertyType = propertyType
      if (saleDateMonths) filters.saleDateMonths = parseInt(saleDateMonths)
      if (sortBy) filters.sortBy = sortBy as SearchFilters['sortBy']

      const results = await searchComparables(address, type, filters)
      const source = getLastSource()
      return NextResponse.json({
        address,
        type,
        filters,
        count: results.length,
        sales: results,
        source,
      })
    }

    // No filters — use original functions for backward compatibility
    if (type === 'buy') {
      const listings = await lookupOnMarket(address)
      const source = getLastSource()
      return NextResponse.json({ address, count: listings.length, sales: listings, source })
    }
    const sales = await lookupComparables(address)
    const source = getLastSource()
    return NextResponse.json({ address, count: sales.length, sales, source })
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

    // Fetch both sold and on-market in parallel
    const [sales, onMarket] = await Promise.all([
      lookupComparables(address),
      lookupOnMarket(address),
    ])

    const source = getLastSource()
    const sourceLabel = source === 'apify' ? 'apify (realestate.com.au)' : 'homely.com.au'

    if (sales.length > 0) {
      proposal.recentSales = sales
    }
    if (onMarket.length > 0) {
      proposal.onMarketListings = onMarket
    }
    if (sales.length > 0 || onMarket.length > 0) {
      await saveProposal(proposal)
      logActivity(proposalId, 'comparables_updated', `Found ${sales.length} sold + ${onMarket.length} on-market from ${sourceLabel}`)
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

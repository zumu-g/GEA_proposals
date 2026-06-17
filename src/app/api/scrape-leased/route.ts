import { NextResponse } from 'next/server'
import { parseAddress } from '@/lib/comparables-lookup'
import { isApifyRentalAvailable, scrapeSuburbLeased } from '@/lib/rental-scraper'

// POST /api/scrape-leased  { suburb: "cranbourne north" }
// On-demand Apify scrape of REA leased listings for the given suburb. Used by
// the rental flow's no-data fallback so a thin rental suburb can self-populate
// leased comparables (the sold-scrape path can never populate leased data).
export async function POST(request: Request) {
  if (!isApifyRentalAvailable()) {
    return NextResponse.json({ error: 'APIFY_API_TOKEN not set', scraped: 0, stored: 0 }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  const suburbInput = body.suburb || body.address || ''

  if (!suburbInput) {
    return NextResponse.json({ error: 'suburb parameter required' }, { status: 400 })
  }

  const parts = parseAddress(suburbInput)
  if (!parts) {
    return NextResponse.json({ error: `Could not parse: ${suburbInput}` }, { status: 400 })
  }

  try {
    console.log(`[scrape-leased] Scraping ${parts.suburb} leased via Apify...`)
    const { scraped, stored } = await scrapeSuburbLeased(parts.suburb, parts.postcode)
    console.log(`[scrape-leased] ${parts.suburb}: ${scraped} scraped, ${stored} stored`)
    return NextResponse.json({ scraped, stored, suburb: parts.suburb })
  } catch (err) {
    console.error('[scrape-leased] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scrape failed', scraped: 0, stored: 0 },
      { status: 500 },
    )
  }
}

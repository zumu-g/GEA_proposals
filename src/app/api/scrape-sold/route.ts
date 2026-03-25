import { NextResponse } from 'next/server'
import { parseAddress } from '@/lib/comparables-lookup'
import { isFirecrawlAvailable, scrapeSoldListings } from '@/lib/firecrawl-scraper'
import { upsertSoldProperties, getSoldPropertyCount } from '@/lib/property-cache'
import { geocodeAddress } from '@/lib/geocoding'

// POST /api/scrape-sold  { suburb: "berwick" }
// Triggers a Firecrawl scrape of sold listings for the given suburb
export async function POST(request: Request) {
  if (!isFirecrawlAvailable()) {
    return NextResponse.json({ error: 'FIRECRAWL_API_KEY not set' }, { status: 503 })
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

  const pages = body.pages || 3

  try {
    console.log(`[scrape-sold] Scraping ${parts.suburb} via Firecrawl (${pages} pages)...`)
    const results = await scrapeSoldListings(parts.suburb, parts.state, parts.postcode, pages)

    if (results.length === 0) {
      return NextResponse.json({ scraped: 0, stored: 0, suburb: parts.suburb, message: 'No results from Firecrawl' })
    }

    // Geocode addresses that don't have lat/lng (Nominatim, 1 req/sec)
    // Only geocode first 15 inline to avoid API timeout — rest stored without coords
    let geocoded = 0
    const toGeocode = results.filter(r => !r.lat || !r.lng).slice(0, 15)
    for (const result of toGeocode) {
      try {
        const coords = await geocodeAddress(result.address)
        if (coords) {
          result.lat = coords.lat
          result.lng = coords.lng
          geocoded++
        }
      } catch {
        // Skip failed geocoding
      }
    }
    if (geocoded > 0) {
      console.log(`[scrape-sold] Geocoded ${geocoded} of ${results.length} addresses (${results.length - geocoded} pending)`)
    }

    const stored = upsertSoldProperties(results)
    const total = getSoldPropertyCount(parts.suburb)

    console.log(`[scrape-sold] Stored ${stored} sold properties for ${parts.suburb} (total in DB: ${total})`)

    return NextResponse.json({
      scraped: results.length,
      stored,
      total,
      suburb: parts.suburb,
      dateRange: {
        oldest: results.map(r => r.soldDate).filter(Boolean).sort()[0] || null,
        newest: results.map(r => r.soldDate).filter(Boolean).sort().pop() || null,
      },
    })
  } catch (err) {
    console.error('[scrape-sold] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scrape failed' },
      { status: 500 },
    )
  }
}

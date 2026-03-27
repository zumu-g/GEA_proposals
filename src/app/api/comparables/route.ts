import { NextResponse } from 'next/server'
import { lookupComparables, lookupOnMarket, searchComparables, getLastSource, SearchFilters, parseAddress, NEIGHBORING_SUBURBS } from '@/lib/comparables-lookup'
import { isApifyAvailable, refreshApifyData } from '@/lib/apify-scraper'
import { isFirecrawlAvailable, scrapeOnMarketListings } from '@/lib/firecrawl-scraper'
import { getProposal, saveProposal, logActivity } from '@/lib/proposal-generator'

// ─── Cache imports (created by other agent — fallback gracefully if missing) ──
let cacheAvailable = false
let getCachedSold: ((suburb: string, filters?: any) => any[]) | null = null
let getCachedOnMarket: ((suburb: string, filters?: any) => any[]) | null = null
let isCacheFresh: ((suburb: string, listingType: string, maxAgeHours?: number) => boolean) | null = null
let getCacheMetadata: ((suburb: string) => any) | null = null
let refreshSoldCache: ((suburb: string) => Promise<{ count: number; source: string }>) | null = null
let refreshOnMarketCache: ((suburb: string) => Promise<{ count: number; source: string }>) | null = null
let getSoldPropertiesBySuburbs: ((suburbs: string[]) => any[]) | null = null

try {
  const propertyCache = require('@/lib/property-cache')
  const cacheRefresh = require('@/lib/cache-refresh')
  getCachedSold = propertyCache.getCachedSold
  getCachedOnMarket = propertyCache.getCachedOnMarket
  isCacheFresh = propertyCache.isCacheFresh
  getCacheMetadata = propertyCache.getCacheMetadata
  getSoldPropertiesBySuburbs = propertyCache.getSoldPropertiesBySuburbs
  refreshSoldCache = cacheRefresh.refreshSoldCache
  refreshOnMarketCache = cacheRefresh.refreshOnMarketCache
  cacheAvailable = true
  console.log('[api/comparables] SQLite cache modules loaded')
} catch {
  console.log('[api/comparables] Cache modules not available — using live scraping only')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface CachedProperty {
  address: string
  price: number | null
  priceDisplay: string | null
  bedrooms: number
  bathrooms: number
  carSpaces: number
  propertyType: string
  soldDate: string | null
  url: string
  imageUrl: string | null
  lat: number | null
  lng: number | null
  landSize: number | null
  daysOnMarket: number | null
}

/**
 * Extract suburb name from an address string using parseAddress.
 * Returns lowercased suburb name.
 */
function extractSuburb(address: string): string {
  const parts = parseAddress(address)
  if (parts) return parts.suburb.toLowerCase()
  // Fallback: treat the whole input as a suburb name
  return address.replace(/[,]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
}

/**
 * Convert a CachedProperty to the API format the wizard components expect.
 */
function toApiFormat(p: CachedProperty) {
  return {
    address: p.address,
    price: p.price || 0,
    askingPrice: p.priceDisplay || (p.price ? `$${p.price.toLocaleString()}` : 'Contact Agent'),
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    carSpaces: p.carSpaces,
    cars: p.carSpaces,
    propertyType: p.propertyType,
    date: p.soldDate || '',
    soldDate: p.soldDate || '',
    url: p.url,
    link: p.url,
    imageUrl: p.imageUrl,
    lat: p.lat,
    lng: p.lng,
    landSize: p.landSize ? `${p.landSize}m²` : null,
    daysOnMarket: p.daysOnMarket,
    // Backward compat fields
    sqft: 0,
    distance: 0,
  }
}

/**
 * Get a human-readable cache age string from metadata.
 */
function getCacheAgeString(suburb: string, listingType: string): string {
  if (!getCacheMetadata) return ''
  try {
    const meta = getCacheMetadata(suburb)
    const entry = listingType === 'sold' ? meta?.sold : meta?.on_market
    if (!entry?.last_refreshed) return ''

    const refreshedAt = new Date(entry.last_refreshed)
    const now = new Date()
    const diffMs = now.getTime() - refreshedAt.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  } catch {
    return ''
  }
}

/**
 * Build filter object to pass to getCachedSold / getCachedOnMarket.
 */
function buildCacheFilters(searchParams: URLSearchParams): Record<string, any> | undefined {
  const filters: Record<string, any> = {}
  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')
  const minBedrooms = searchParams.get('minBedrooms')
  const minBathrooms = searchParams.get('minBathrooms')
  const minCarSpaces = searchParams.get('minCarSpaces')
  const propertyType = searchParams.get('propertyType')
  const saleDateMonths = searchParams.get('saleDateMonths')
  const sortBy = searchParams.get('sortBy')

  if (minPrice) filters.minPrice = parseInt(minPrice)
  if (maxPrice) filters.maxPrice = parseInt(maxPrice)
  if (minBedrooms) filters.minBedrooms = parseInt(minBedrooms)
  if (minBathrooms) filters.minBathrooms = parseInt(minBathrooms)
  if (minCarSpaces) filters.minCarSpaces = parseInt(minCarSpaces)
  if (propertyType) filters.propertyType = propertyType
  if (saleDateMonths) filters.saleDateMonths = parseInt(saleDateMonths)
  if (sortBy) filters.sortBy = sortBy

  return Object.keys(filters).length > 0 ? filters : undefined
}

// ─── GET handler ──────────────────────────────────────────────────────────────
// GET /api/comparables?address=42+Smith+St,+Brighton+VIC+3186
// Optional filter params: minPrice, maxPrice, minBedrooms, minBathrooms, minCarSpaces, propertyType, saleDateMonths, sortBy
// Optional: refresh=true to force a fresh scrape (bypasses cache)
// Optional: type=sold|buy (default: sold)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'address parameter required' }, { status: 400 })
  }

  const type = (searchParams.get('type') as 'sold' | 'buy') || 'sold'
  const refresh = searchParams.get('refresh') === 'true'
  const suburb = extractSuburb(address)
  const listingType = type === 'buy' ? 'on_market' : 'sold'
  const cacheFilters = buildCacheFilters(searchParams)

  const sourceParam = searchParams.get('source')

  try {
    // ── Step 0: source=local — read directly from sold_properties table ───
    if (sourceParam === 'local' && getSoldPropertiesBySuburbs) {
      console.log(`[api/comparables] source=local — reading directly from sold_properties for ${suburb}`)
      const neighbors = NEIGHBORING_SUBURBS[suburb] || []
      const allSuburbs = [suburb, ...neighbors]
      const localSales = getSoldPropertiesBySuburbs(allSuburbs)

      const results = localSales.map(toApiFormat)

      return NextResponse.json({
        address,
        type,
        count: results.length,
        sales: results,
        source: 'local-db',
        cached: true,
        filters: cacheFilters,
      })
    }

    if (sourceParam === 'local' && !getSoldPropertiesBySuburbs) {
      return NextResponse.json(
        { error: 'Local database module not available' },
        { status: 503 }
      )
    }

    // ── Step 0: Try local sold_properties DB first (Firecrawl data, freshest) ──
    if (!refresh && listingType === 'sold' && getSoldPropertiesBySuburbs) {
      try {
        const neighbors = NEIGHBORING_SUBURBS[suburb] || []
        const allSuburbs = [suburb, ...neighbors]
        const localSales = getSoldPropertiesBySuburbs(allSuburbs)

        if (localSales.length >= 5) {
          console.log(`[api/comparables] Local DB HIT for ${suburb} — ${localSales.length} sold properties`)
          return NextResponse.json({
            address,
            type,
            count: localSales.length,
            sales: localSales.map((s: any) => ({
              address: s.address,
              price: s.price,
              date: s.soldDate || s.sold_date || '',
              bedrooms: s.bedrooms || 0,
              bathrooms: s.bathrooms || 0,
              cars: s.carSpaces || s.car_spaces || 0,
              propertyType: s.propertyType || s.property_type || 'House',
              url: s.url || '',
              imageUrl: s.imageUrl || s.image_url || '',
              lat: s.lat,
              lng: s.lng,
              distance: 0,
              sqft: 0,
            })),
            source: 'local-db',
            cached: false,
            cacheAge: 'fresh',
          })
        }
      } catch (err) {
        console.error('[api/comparables] Local DB read failed:', err)
      }
    }

    // ── Step 1: Try old SQLite cache (homely data, unless refresh forced) ──────
    if (!refresh && cacheAvailable && isCacheFresh && getCachedSold && getCachedOnMarket) {
      try {
        // Sold data is good for 7 days, on-market for 24 hours
        const maxAge = listingType === 'sold' ? 168 : 24

        if (isCacheFresh(suburb, listingType, maxAge)) {
          console.log(`[api/comparables] Cache HIT for ${suburb} (${listingType})`)
          const cached = listingType === 'sold'
            ? getCachedSold(suburb, cacheFilters)
            : getCachedOnMarket(suburb, cacheFilters)

          const cacheAge = getCacheAgeString(suburb, listingType)

          return NextResponse.json({
            address,
            type,
            count: cached.length,
            sales: cached.map(toApiFormat),
            source: 'cache',
            cached: true,
            cacheAge,
            filters: cacheFilters,
          })
        }

        console.log(`[api/comparables] Cache MISS/STALE for ${suburb} (${listingType})`)
      } catch (cacheErr) {
        console.error('[api/comparables] Cache read failed, falling through to live:', cacheErr)
      }
    }

    // ── Step 2: Cache miss or refresh — try to refresh cache via scraping ──
    if (cacheAvailable && refreshSoldCache && refreshOnMarketCache && getCachedSold && getCachedOnMarket) {
      try {
        console.log(`[api/comparables] ${refresh ? 'Forced refresh' : 'Cache miss'} — scraping ${suburb} (${listingType})`)

        if (type === 'buy') {
          const result = await refreshOnMarketCache(suburb)
          const cached = getCachedOnMarket(suburb, cacheFilters)
          const cacheAge = getCacheAgeString(suburb, listingType)

          return NextResponse.json({
            address,
            type,
            count: cached.length,
            sales: cached.map(toApiFormat),
            source: result.source,
            cached: false,
            refreshed: true,
            cacheAge,
            filters: cacheFilters,
          })
        } else {
          const result = await refreshSoldCache(suburb)
          const cached = getCachedSold(suburb, cacheFilters)
          const cacheAge = getCacheAgeString(suburb, listingType)

          return NextResponse.json({
            address,
            type,
            count: cached.length,
            sales: cached.map(toApiFormat),
            source: result.source,
            cached: false,
            refreshed: true,
            cacheAge,
            filters: cacheFilters,
          })
        }
      } catch (refreshErr) {
        console.error('[api/comparables] Cache refresh failed, falling through to legacy scraping:', refreshErr)
      }
    }

    // ── Step 2b: Firecrawl on-market fallback ─────────────────────────────
    if (type === 'buy' && isFirecrawlAvailable()) {
      try {
        const parts = parseAddress(address) || { suburb, state: 'vic', postcode: '' }
        // Look up postcode from NEIGHBORING_SUBURBS keys or parsed address
        const postcode = parts.postcode || ''
        if (parts.suburb && postcode) {
          console.log(`[api/comparables] Scraping on-market via Firecrawl for ${parts.suburb}`)
          const listings = await scrapeOnMarketListings(parts.suburb, parts.state || 'vic', postcode, 3)
          if (listings.length > 0) {
            return NextResponse.json({
              address,
              type,
              count: listings.length,
              sales: listings.map((s: any) => ({
                address: s.address,
                price: s.price,
                askingPrice: s.price ? `$${s.price.toLocaleString()}` : '',
                date: s.soldDate || '',
                bedrooms: s.bedrooms || 0,
                bathrooms: s.bathrooms || 0,
                cars: s.carSpaces || 0,
                propertyType: s.propertyType || 'House',
                url: s.url || '',
                imageUrl: s.imageUrl || '',
                lat: s.lat,
                lng: s.lng,
                distance: 0,
                sqft: 0,
              })),
              source: 'firecrawl',
              cached: false,
            })
          }
        }
      } catch (err) {
        console.error('[api/comparables] Firecrawl on-market scrape failed:', err)
      }
    }

    // ── Step 3: Fallback — legacy live scraping (no cache module) ─────────
    console.log(`[api/comparables] Falling back to legacy live scraping for ${address}`)

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
          cached: false,
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
          cached: false,
          refreshed: true,
        })
      }

      console.log(`[api/comparables] Refresh returned no results, falling through to normal lookup`)
    }

    // Check if any filter params are present
    const hasFilters = cacheFilters !== undefined

    // If filters are provided, use the enhanced searchComparables
    if (hasFilters) {
      const filters: SearchFilters = {}
      if (cacheFilters!.minPrice) filters.minPrice = cacheFilters!.minPrice
      if (cacheFilters!.maxPrice) filters.maxPrice = cacheFilters!.maxPrice
      if (cacheFilters!.minBedrooms) filters.minBedrooms = cacheFilters!.minBedrooms
      if (cacheFilters!.minBathrooms) filters.minBathrooms = cacheFilters!.minBathrooms
      if (cacheFilters!.minCarSpaces) filters.minCarSpaces = cacheFilters!.minCarSpaces
      if (cacheFilters!.propertyType) filters.propertyType = cacheFilters!.propertyType
      if (cacheFilters!.saleDateMonths) filters.saleDateMonths = cacheFilters!.saleDateMonths
      if (cacheFilters!.sortBy) filters.sortBy = cacheFilters!.sortBy

      const results = await searchComparables(address, type, filters)
      const source = getLastSource()
      return NextResponse.json({
        address,
        type,
        filters,
        count: results.length,
        sales: results,
        source,
        cached: false,
      })
    }

    // No filters — use original functions for backward compatibility
    if (type === 'buy') {
      const listings = await lookupOnMarket(address)
      const source = getLastSource()
      return NextResponse.json({ address, count: listings.length, sales: listings, source, cached: false })
    }
    const sales = await lookupComparables(address)
    const source = getLastSource()
    return NextResponse.json({ address, count: sales.length, sales, source, cached: false })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Lookup failed' },
      { status: 500 }
    )
  }
}

// ─── POST handler ─────────────────────────────────────────────────────────────
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
    const suburb = extractSuburb(address)

    // Try cache-first approach for POST as well
    if (cacheAvailable && refreshSoldCache && refreshOnMarketCache && getCachedSold && getCachedOnMarket) {
      try {
        // Refresh both sold and on-market caches
        const [soldResult, onMarketResult] = await Promise.all([
          refreshSoldCache(suburb),
          refreshOnMarketCache(suburb),
        ])

        const soldCached = getCachedSold(suburb)
        const onMarketCached = getCachedOnMarket(suburb)

        const sales = soldCached.map(toApiFormat)
        const onMarket = onMarketCached.map(toApiFormat)

        const sourceLabel = soldResult.source || onMarketResult.source || 'cache'

        if (sales.length > 0) {
          proposal.recentSales = sales as any
        }
        if (onMarket.length > 0) {
          proposal.onMarketListings = onMarket as any
        }
        if (sales.length > 0 || onMarket.length > 0) {
          await saveProposal(proposal)
          logActivity(proposalId, 'comparables_updated', `Found ${sales.length} sold + ${onMarket.length} on-market from ${sourceLabel}`)
        }

        return NextResponse.json({
          success: true,
          proposalId,
          address,
          source: sourceLabel,
          cached: false,
          refreshed: true,
          sold: { count: sales.length, sales },
          onMarket: { count: onMarket.length, listings: onMarket },
        })
      } catch (cacheErr) {
        console.error('[api/comparables POST] Cache approach failed, falling back to legacy:', cacheErr)
      }
    }

    // Fallback: legacy live scraping
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

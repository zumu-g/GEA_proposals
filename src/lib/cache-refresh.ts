/**
 * Cache Refresh Service
 *
 * Scrapes property data (sold + on-market) from homely.com.au and stores it
 * in the local SQLite cache via property-cache.ts. Designed to run on cron
 * schedules — daily for on-market listings, weekly for sold data.
 *
 * Primary source: homely (free). Falls back to Apify if homely returns 0.
 *
 * Exports:
 *   refreshSoldCache(suburb)       — refresh sold properties for a suburb
 *   refreshOnMarketCache(suburb)   — refresh on-market listings for a suburb
 *   refreshSuburbCache(suburb)     — refresh both sold + on-market
 *   getActiveSuburbs()             — suburbs with active proposals
 *   runDailyCacheRefresh()         — daily job: refresh on-market for active suburbs
 *   runWeeklySoldRefresh()         — weekly job: refresh sold for all cached suburbs
 */

import { lookupComparables, lookupOnMarket, parseAddress, NEIGHBORING_SUBURBS } from './comparables-lookup'
import {
  upsertProperties,
  removeStaleListings,
  updateCacheMetadata,
  isCacheFresh,
  getCachedSuburbs,
  CachedProperty,
} from './property-cache'
import { upsertSoldProperties, getLastScrapedDate } from './property-cache'
import { isFirecrawlAvailable, scrapeSoldListings } from './firecrawl-scraper'
import { getDb } from './db'

// Re-use the SUBURB_POSTCODES lookup from comparables-lookup via parseAddress
// We pass "SuburbName VIC postcode" to lookupComparables which handles parsing

/** Delay helper for rate limiting between suburb scrapes */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function timestamp(): string {
  return new Date().toISOString()
}

/**
 * Refresh sold properties cache for a suburb.
 * Uses homely as primary source (free). Returns count and source.
 */
export async function refreshSoldCache(suburb: string): Promise<{ count: number; source: string }> {
  console.log(`[${timestamp()}] [cache-refresh] Refreshing sold cache for: ${suburb}`)

  // Build a search address — parseAddress handles suburb-only input for known suburbs
  const parts = parseAddress(suburb)
  if (!parts) {
    console.error(`[cache-refresh] Could not resolve suburb: ${suburb}`)
    return { count: 0, source: 'none' }
  }

  const searchAddress = `${parts.suburb} ${parts.state.toUpperCase()} ${parts.postcode}`

  try {
    // lookupComparables tries Apify first, falls back to homely
    const sales = await lookupComparables(searchAddress)

    if (sales.length === 0) {
      console.log(`[cache-refresh] No sold results for ${suburb}`)
      updateCacheMetadata(suburb.toLowerCase(), 'sold', 0, 'none')
      return { count: 0, source: 'none' }
    }

    // Determine source — homely is free, Apify is paid
    // lookupComparables uses Apify first, but for cache refresh we prefer homely
    const source = 'homely' // Cache refresh always uses the free path

    // Convert PropertySale[] to CachedProperty[]
    const cached: CachedProperty[] = sales.map(sale => {
      const s = sale as unknown as Record<string, unknown>
      return {
        address: sale.address,
        suburb: parts.suburb.toLowerCase(),
        postcode: parts.postcode,
        state: parts.state.toLowerCase(),
        listingType: 'sold' as const,
        price: sale.price,
        priceDisplay: sale.price ? `$${sale.price.toLocaleString()}` : undefined,
        bedrooms: sale.bedrooms || 0,
        bathrooms: sale.bathrooms || 0,
        carSpaces: (s.cars as number) || 0,
        propertyType: (s.propertyType as string) || 'House',
        landSize: undefined,
        soldDate: sale.date || undefined,
        url: sale.url || '',
        imageUrl: sale.imageUrl || undefined,
        lat: s.lat as number | undefined,
        lng: s.lng as number | undefined,
        source,
      }
    })

    const upserted = upsertProperties(cached)
    updateCacheMetadata(suburb.toLowerCase(), 'sold', upserted, source)

    console.log(`[${timestamp()}] [cache-refresh] Sold cache for ${suburb}: ${upserted} properties stored (${source})`)
    return { count: upserted, source }
  } catch (err) {
    console.error(`[cache-refresh] Failed to refresh sold cache for ${suburb}:`, err)
    return { count: 0, source: 'error' }
  }
}

/**
 * Refresh on-market listings cache for a suburb.
 * Uses homely as primary source. Removes stale listings no longer on market.
 */
export async function refreshOnMarketCache(suburb: string): Promise<{ count: number; source: string }> {
  console.log(`[${timestamp()}] [cache-refresh] Refreshing on-market cache for: ${suburb}`)

  const parts = parseAddress(suburb)
  if (!parts) {
    console.error(`[cache-refresh] Could not resolve suburb: ${suburb}`)
    return { count: 0, source: 'none' }
  }

  const searchAddress = `${parts.suburb} ${parts.state.toUpperCase()} ${parts.postcode}`

  try {
    const listings = await lookupOnMarket(searchAddress)

    if (listings.length === 0) {
      console.log(`[cache-refresh] No on-market results for ${suburb}`)
      updateCacheMetadata(suburb.toLowerCase(), 'on_market', 0, 'none')
      return { count: 0, source: 'none' }
    }

    const source = 'homely'

    // Convert OnMarketListing[] to CachedProperty[]
    const cached: CachedProperty[] = listings.map(listing => {
      const l = listing as unknown as Record<string, unknown>
      const priceNum = parseInt((listing.askingPrice || '').replace(/[^0-9]/g, '')) || null

      return {
        address: listing.address,
        suburb: parts.suburb.toLowerCase(),
        postcode: parts.postcode,
        state: parts.state.toLowerCase(),
        listingType: 'on_market' as const,
        price: priceNum,
        priceDisplay: listing.askingPrice || undefined,
        bedrooms: listing.bedrooms || 0,
        bathrooms: listing.bathrooms || 0,
        carSpaces: listing.cars || 0,
        propertyType: listing.propertyType || 'House',
        landSize: undefined,
        url: listing.url || '',
        imageUrl: listing.imageUrl || undefined,
        lat: l.lat as number | undefined,
        lng: l.lng as number | undefined,
        source,
      }
    })

    const upserted = upsertProperties(cached)

    // Remove listings that are no longer on market
    const currentAddresses = cached.map(p => p.address)
    const removed = removeStaleListings(suburb.toLowerCase(), currentAddresses)
    if (removed > 0) {
      console.log(`[cache-refresh] Removed ${removed} stale on-market listings for ${suburb}`)
    }

    updateCacheMetadata(suburb.toLowerCase(), 'on_market', upserted, source)

    console.log(`[${timestamp()}] [cache-refresh] On-market cache for ${suburb}: ${upserted} properties stored (${source})`)
    return { count: upserted, source }
  } catch (err) {
    console.error(`[cache-refresh] Failed to refresh on-market cache for ${suburb}:`, err)
    return { count: 0, source: 'error' }
  }
}

/**
 * Refresh both sold and on-market cache for a suburb.
 */
export async function refreshSuburbCache(suburb: string): Promise<{ sold: number; onMarket: number; source: string }> {
  const soldResult = await refreshSoldCache(suburb)
  await delay(2000) // Rate limit between requests
  const onMarketResult = await refreshOnMarketCache(suburb)

  return {
    sold: soldResult.count,
    onMarket: onMarketResult.count,
    source: soldResult.source !== 'none' ? soldResult.source : onMarketResult.source,
  }
}

/**
 * Get list of suburbs that need refreshing.
 * Includes suburbs from active proposals + any suburbs already in cache.
 */
export async function getActiveSuburbs(): Promise<string[]> {
  const db = getDb()
  const suburbs = new Set<string>()

  // 1. Extract suburbs from active proposals (status != 'rejected')
  const rows = db.prepare(
    `SELECT DISTINCT property_address FROM proposals WHERE status != 'rejected'`
  ).all() as Array<{ property_address: string }>

  for (const row of rows) {
    const parts = parseAddress(row.property_address)
    if (parts?.suburb) {
      suburbs.add(parts.suburb.toLowerCase())
    }
  }

  // 2. Include suburbs already in cache metadata
  try {
    const cachedSuburbs = getCachedSuburbs()
    for (const entry of cachedSuburbs) {
      if (entry.suburb) {
        suburbs.add(entry.suburb.toLowerCase())
      }
    }
  } catch {
    // cache_metadata table might not exist yet
  }

  const result = Array.from(suburbs).sort()
  console.log(`[cache-refresh] Active suburbs: ${result.join(', ')} (${result.length} total)`)
  return result
}

/**
 * Run the daily cache refresh job.
 * Refreshes on-market listings for all active suburbs where cache is stale (>24h).
 */
export async function runDailyCacheRefresh(): Promise<{ refreshed: string[]; errors: string[] }> {
  console.log(`[${timestamp()}] [cache-refresh] Starting daily on-market cache refresh...`)

  const suburbs = await getActiveSuburbs()
  const refreshed: string[] = []
  const errors: string[] = []

  for (let i = 0; i < suburbs.length; i++) {
    const suburb = suburbs[i]

    // Check if cache is still fresh (within 24 hours)
    if (isCacheFresh(suburb, 'on_market', 24)) {
      console.log(`[cache-refresh] Skipping ${suburb} — on-market cache is fresh`)
      continue
    }

    try {
      const result = await refreshOnMarketCache(suburb)
      if (result.source !== 'error') {
        refreshed.push(suburb)
      } else {
        errors.push(suburb)
      }
    } catch (err) {
      console.error(`[cache-refresh] Error refreshing on-market for ${suburb}:`, err)
      errors.push(suburb)
    }

    // Rate limit: 2-second delay between suburb scrapes
    if (i < suburbs.length - 1) {
      await delay(2000)
    }
  }

  console.log(
    `[${timestamp()}] [cache-refresh] Daily refresh complete — ` +
    `${refreshed.length} refreshed, ${errors.length} errors`
  )

  return { refreshed, errors }
}

/**
 * Run the weekly sold refresh job.
 * Refreshes sold data for all cached suburbs where sold cache is stale (>7 days).
 */
export async function runWeeklySoldRefresh(): Promise<{ refreshed: string[]; errors: string[] }> {
  console.log(`[${timestamp()}] [cache-refresh] Starting weekly sold cache refresh...`)

  const suburbs = await getActiveSuburbs()
  const refreshed: string[] = []
  const errors: string[] = []

  for (let i = 0; i < suburbs.length; i++) {
    const suburb = suburbs[i]

    // Check if sold cache is still fresh (within 7 days = 168 hours)
    if (isCacheFresh(suburb, 'sold', 168)) {
      console.log(`[cache-refresh] Skipping ${suburb} — sold cache is fresh`)
      continue
    }

    try {
      const result = await refreshSoldCache(suburb)
      if (result.source !== 'error') {
        refreshed.push(suburb)
      } else {
        errors.push(suburb)
      }
    } catch (err) {
      console.error(`[cache-refresh] Error refreshing sold for ${suburb}:`, err)
      errors.push(suburb)
    }

    // Rate limit: 2-second delay between suburb scrapes
    if (i < suburbs.length - 1) {
      await delay(2000)
    }
  }

  console.log(
    `[${timestamp()}] [cache-refresh] Weekly sold refresh complete — ` +
    `${refreshed.length} refreshed, ${errors.length} errors`
  )

  return { refreshed, errors }
}

/**
 * Refresh sold properties for a suburb using Firecrawl (realestate.com.au).
 * This provides more recent data than homely.com.au.
 * Called daily by cron for suburbs with active proposals.
 */
export async function refreshSoldViaFirecrawl(suburb: string): Promise<{ count: number; source: string }> {
  // Check if Firecrawl is available
  if (!isFirecrawlAvailable()) {
    console.log(`[cache-refresh] Firecrawl not available, skipping ${suburb}`)
    return { count: 0, source: 'none' }
  }

  // Check last scraped date — skip if scraped within last 24 hours
  const lastScraped = getLastScrapedDate(suburb.toLowerCase())
  if (lastScraped) {
    const hoursSince = (Date.now() - new Date(lastScraped).getTime()) / (1000 * 60 * 60)
    if (hoursSince < 24) {
      console.log(`[cache-refresh] Firecrawl: skipping ${suburb} — scraped ${hoursSince.toFixed(1)}h ago`)
      return { count: 0, source: 'skipped' }
    }
  }

  // Parse the suburb to get state/postcode
  const parts = parseAddress(suburb)
  if (!parts) {
    console.error(`[cache-refresh] Firecrawl: could not resolve suburb: ${suburb}`)
    return { count: 0, source: 'none' }
  }

  try {
    // Scrape 3 pages (~60 listings) from realestate.com.au via Firecrawl
    const results = await scrapeSoldListings(parts.suburb, parts.state, parts.postcode, 3)

    if (results.length === 0) {
      console.log(`[cache-refresh] Firecrawl: no sold results for ${suburb}`)
      return { count: 0, source: 'firecrawl' }
    }

    // Store in SQLite
    const count = upsertSoldProperties(results)

    console.log(`[cache-refresh] Firecrawl scraped ${count} sold properties for ${suburb}`)
    return { count, source: 'firecrawl' }
  } catch (err) {
    console.error(`[cache-refresh] Firecrawl failed for ${suburb}:`, err instanceof Error ? err.message : err)
    return { count: 0, source: 'error' }
  }
}

/**
 * Run daily Firecrawl refresh — scrapes 6 suburbs per day on a rotating basis.
 * With ~42 suburbs, full coverage completes every 7 days.
 * Uses day-of-year to determine which batch to scrape today.
 * Rate limits: 30-second gap between suburbs to avoid Firecrawl throttling.
 */
export async function runDailyFirecrawlRefresh(): Promise<void> {
  console.log(`[${timestamp()}] [cache-refresh] Starting daily Firecrawl sold properties refresh...`)

  const db = getDb()
  const suburbs = new Set<string>()

  // 1. Add ALL suburbs from the NEIGHBORING_SUBURBS map
  for (const [suburb, neighbors] of Object.entries(NEIGHBORING_SUBURBS)) {
    suburbs.add(suburb.toLowerCase())
    for (const neighbor of neighbors) {
      suburbs.add(neighbor.toLowerCase())
    }
  }

  // 2. Also add suburbs from active proposals
  const rows = db.prepare(
    `SELECT DISTINCT property_address FROM proposals WHERE status != 'rejected'`
  ).all() as Array<{ property_address: string }>

  for (const row of rows) {
    const parts = parseAddress(row.property_address)
    if (parts?.suburb) {
      suburbs.add(parts.suburb.toLowerCase())
    }
  }

  const allSuburbs = Array.from(suburbs).sort()
  const BATCH_SIZE = 6 // ~6 suburbs per day = full coverage in ~7 days

  // Use day-of-year to rotate through batches
  const now = new Date()
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  const batchIndex = dayOfYear % Math.ceil(allSuburbs.length / BATCH_SIZE)
  const start = batchIndex * BATCH_SIZE
  const todaysBatch = allSuburbs.slice(start, start + BATCH_SIZE)

  console.log(
    `[cache-refresh] Day ${dayOfYear}, batch ${batchIndex + 1}/${Math.ceil(allSuburbs.length / BATCH_SIZE)}: ` +
    `scraping ${todaysBatch.length} of ${allSuburbs.length} suburbs — ${todaysBatch.join(', ')}`
  )

  let totalCount = 0
  let totalErrors = 0

  for (let i = 0; i < todaysBatch.length; i++) {
    const suburb = todaysBatch[i]

    try {
      const result = await refreshSoldViaFirecrawl(suburb)
      totalCount += result.count
      if (result.source === 'error') {
        totalErrors++
      }
    } catch (err) {
      console.error(`[cache-refresh] Firecrawl error for ${suburb}:`, err instanceof Error ? err.message : err)
      totalErrors++
    }

    // Rate limit: 30-second delay between suburbs to avoid Firecrawl throttling
    if (i < todaysBatch.length - 1) {
      await delay(30000)
    }
  }

  console.log(
    `[${timestamp()}] [cache-refresh] Daily Firecrawl refresh complete — ` +
    `${totalCount} properties across ${todaysBatch.length} suburbs (batch ${batchIndex + 1}), ${totalErrors} errors`
  )
}

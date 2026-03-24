import { getDb } from './db'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CachedProperty {
  id?: number
  address: string
  suburb: string
  state: string
  postcode: string
  streetAddress?: string
  price: number | null
  priceDisplay?: string
  bedrooms: number
  bathrooms: number
  carSpaces: number
  propertyType: string
  landSize?: string
  listingType: 'sold' | 'on_market'
  soldDate?: string
  daysOnMarket?: number
  url: string
  imageUrl?: string
  images?: string[]
  lat?: number
  lng?: number
  source: string
  scrapedAt?: string
}

export interface CacheInfo {
  lastScrapedAt: string
  resultCount: number
  source: string
}

interface PropertyFilters {
  minPrice?: number
  maxPrice?: number
  minBedrooms?: number
  minBathrooms?: number
  minCars?: number
  propertyType?: string
  soldWithinMonths?: number
  sortBy?: 'price_asc' | 'price_desc' | 'date_newest' | 'date_oldest' | 'bedrooms'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map a DB row to a CachedProperty object */
function rowToProperty(row: Record<string, unknown>): CachedProperty {
  let images: string[] | undefined
  if (row.images && typeof row.images === 'string') {
    try {
      images = JSON.parse(row.images as string)
    } catch {
      images = undefined
    }
  }

  return {
    id: row.id as number,
    address: row.address as string,
    suburb: row.suburb as string,
    state: (row.state as string) || 'vic',
    postcode: (row.postcode as string) || '',
    streetAddress: row.street_address as string | undefined,
    price: row.price != null ? (row.price as number) : null,
    priceDisplay: row.price_display as string | undefined,
    bedrooms: (row.bedrooms as number) || 0,
    bathrooms: (row.bathrooms as number) || 0,
    carSpaces: (row.car_spaces as number) || 0,
    propertyType: (row.property_type as string) || 'House',
    landSize: row.land_size as string | undefined,
    listingType: row.listing_type as 'sold' | 'on_market',
    soldDate: row.sold_date as string | undefined,
    daysOnMarket: row.days_on_market as number | undefined,
    url: (row.url as string) || '',
    imageUrl: row.image_url as string | undefined,
    images,
    lat: row.lat as number | undefined,
    lng: row.lng as number | undefined,
    source: (row.source as string) || 'homely',
    scrapedAt: row.scraped_at as string | undefined,
  }
}

/** Build WHERE clauses and params from filters */
function buildFilterClauses(filters: PropertyFilters): { clauses: string[]; params: unknown[] } {
  const clauses: string[] = []
  const params: unknown[] = []

  if (filters.minPrice != null) {
    clauses.push('price >= ?')
    params.push(filters.minPrice)
  }
  if (filters.maxPrice != null) {
    clauses.push('price <= ?')
    params.push(filters.maxPrice)
  }
  if (filters.minBedrooms != null) {
    clauses.push('bedrooms >= ?')
    params.push(filters.minBedrooms)
  }
  if (filters.minBathrooms != null) {
    clauses.push('bathrooms >= ?')
    params.push(filters.minBathrooms)
  }
  if (filters.minCars != null) {
    clauses.push('car_spaces >= ?')
    params.push(filters.minCars)
  }
  if (filters.propertyType) {
    clauses.push('LOWER(property_type) = LOWER(?)')
    params.push(filters.propertyType)
  }
  if (filters.soldWithinMonths != null) {
    clauses.push("sold_date >= date('now', ?)")
    params.push(`-${filters.soldWithinMonths} months`)
  }

  return { clauses, params }
}

/** Map sortBy to ORDER BY clause */
function buildOrderBy(sortBy?: PropertyFilters['sortBy']): string {
  switch (sortBy) {
    case 'price_asc':
      return 'ORDER BY price ASC NULLS LAST'
    case 'price_desc':
      return 'ORDER BY price DESC NULLS LAST'
    case 'date_newest':
      return 'ORDER BY sold_date DESC NULLS LAST'
    case 'date_oldest':
      return 'ORDER BY sold_date ASC NULLS LAST'
    case 'bedrooms':
      return 'ORDER BY bedrooms DESC'
    default:
      return 'ORDER BY scraped_at DESC'
  }
}

// ─── Read operations ─────────────────────────────────────────────────────────

/** Get cached sold properties for a suburb, optionally filtered */
export function getCachedSold(suburb: string, filters?: PropertyFilters): CachedProperty[] {
  const db = getDb()
  const { clauses, params } = buildFilterClauses(filters || {})

  const whereParts = ["LOWER(suburb) = LOWER(?)", "listing_type = 'sold'", ...clauses]
  const allParams = [suburb, ...params]
  const orderBy = buildOrderBy(filters?.sortBy)

  const sql = `SELECT * FROM cached_properties WHERE ${whereParts.join(' AND ')} ${orderBy}`
  const rows = db.prepare(sql).all(...allParams) as Record<string, unknown>[]
  return rows.map(rowToProperty)
}

/** Get cached on-market listings for a suburb, optionally filtered */
export function getCachedOnMarket(suburb: string, filters?: Omit<PropertyFilters, 'soldWithinMonths'>): CachedProperty[] {
  const db = getDb()
  const { clauses, params } = buildFilterClauses(filters || {})

  const whereParts = ["LOWER(suburb) = LOWER(?)", "listing_type = 'on_market'", ...clauses]
  const allParams = [suburb, ...params]
  const orderBy = buildOrderBy(filters?.sortBy)

  const sql = `SELECT * FROM cached_properties WHERE ${whereParts.join(' AND ')} ${orderBy}`
  const rows = db.prepare(sql).all(...allParams) as Record<string, unknown>[]
  return rows.map(rowToProperty)
}

/** Check if suburb cache is fresh (within maxAge hours) */
export function isCacheFresh(suburb: string, listingType: 'sold' | 'on_market', maxAgeHours?: number): boolean {
  const db = getDb()

  // Default: 7 days for sold, 24 hours for on_market
  const defaultHours = listingType === 'sold' ? 168 : 24
  const hours = maxAgeHours ?? defaultHours

  const row = db.prepare(
    `SELECT last_scraped_at FROM cache_metadata
     WHERE LOWER(suburb) = LOWER(?) AND listing_type = ?`
  ).get(suburb, listingType) as { last_scraped_at: string } | undefined

  if (!row) return false

  const scrapedAt = new Date(row.last_scraped_at + 'Z')
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
  return scrapedAt > cutoff
}

/** Get cache metadata for a suburb */
export function getCacheMetadata(suburb: string): { sold?: CacheInfo; on_market?: CacheInfo } {
  const db = getDb()

  const rows = db.prepare(
    `SELECT listing_type, last_scraped_at, result_count, source
     FROM cache_metadata WHERE LOWER(suburb) = LOWER(?)`
  ).all(suburb) as Array<{
    listing_type: string
    last_scraped_at: string
    result_count: number
    source: string
  }>

  const result: { sold?: CacheInfo; on_market?: CacheInfo } = {}
  for (const row of rows) {
    const info: CacheInfo = {
      lastScrapedAt: row.last_scraped_at,
      resultCount: row.result_count,
      source: row.source,
    }
    if (row.listing_type === 'sold') result.sold = info
    else if (row.listing_type === 'on_market') result.on_market = info
  }
  return result
}

/** Get all cached suburbs with counts */
export function getCachedSuburbs(): Array<{ suburb: string; soldCount: number; onMarketCount: number; lastUpdated: string }> {
  const db = getDb()

  const rows = db.prepare(`
    SELECT
      suburb,
      SUM(CASE WHEN listing_type = 'sold' THEN 1 ELSE 0 END) as sold_count,
      SUM(CASE WHEN listing_type = 'on_market' THEN 1 ELSE 0 END) as on_market_count,
      MAX(scraped_at) as last_updated
    FROM cached_properties
    GROUP BY LOWER(suburb)
    ORDER BY last_updated DESC
  `).all() as Array<{
    suburb: string
    sold_count: number
    on_market_count: number
    last_updated: string
  }>

  return rows.map(r => ({
    suburb: r.suburb,
    soldCount: r.sold_count,
    onMarketCount: r.on_market_count,
    lastUpdated: r.last_updated,
  }))
}

// ─── Write operations ────────────────────────────────────────────────────────

/** Upsert properties into cache (insert or update on address+listing_type conflict) */
export function upsertProperties(properties: CachedProperty[]): number {
  if (properties.length === 0) return 0

  const db = getDb()

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO cached_properties (
      address, suburb, state, postcode, street_address,
      price, price_display, bedrooms, bathrooms, car_spaces,
      property_type, land_size, listing_type, sold_date, days_on_market,
      url, image_url, images, lat, lng,
      source, scraped_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, datetime('now')
    )
  `)

  const upsertMany = db.transaction((props: CachedProperty[]) => {
    let count = 0
    for (const p of props) {
      stmt.run(
        p.address,
        p.suburb,
        p.state || 'vic',
        p.postcode || null,
        p.streetAddress || null,
        p.price,
        p.priceDisplay || null,
        p.bedrooms || 0,
        p.bathrooms || 0,
        p.carSpaces || 0,
        p.propertyType || 'House',
        p.landSize || null,
        p.listingType,
        p.soldDate || null,
        p.daysOnMarket ?? null,
        p.url || null,
        p.imageUrl || null,
        p.images ? JSON.stringify(p.images) : null,
        p.lat ?? null,
        p.lng ?? null,
        p.source || 'homely',
      )
      count++
    }
    return count
  })

  return upsertMany(properties)
}

/** Remove stale on-market listings that are no longer in the latest scrape */
export function removeStaleListings(suburb: string, currentAddresses: string[]): number {
  const db = getDb()

  if (currentAddresses.length === 0) {
    // If no current addresses, remove all on_market for this suburb
    const result = db.prepare(
      `DELETE FROM cached_properties
       WHERE LOWER(suburb) = LOWER(?) AND listing_type = 'on_market'`
    ).run(suburb)
    return result.changes
  }

  const placeholders = currentAddresses.map(() => '?').join(', ')
  const result = db.prepare(
    `DELETE FROM cached_properties
     WHERE LOWER(suburb) = LOWER(?)
     AND listing_type = 'on_market'
     AND address NOT IN (${placeholders})`
  ).run(suburb, ...currentAddresses)

  return result.changes
}

/** Update cache metadata after a scrape */
export function updateCacheMetadata(suburb: string, listingType: 'sold' | 'on_market', count: number, source: string): void {
  const db = getDb()

  db.prepare(`
    INSERT OR REPLACE INTO cache_metadata (suburb, listing_type, last_scraped_at, result_count, source)
    VALUES (?, ?, datetime('now'), ?, ?)
  `).run(suburb, listingType, count, source)
}

/** Clear cache for a suburb (or all if no suburb provided) */
export function clearCache(suburb?: string): void {
  const db = getDb()

  if (suburb) {
    db.prepare('DELETE FROM cached_properties WHERE LOWER(suburb) = LOWER(?)').run(suburb)
    db.prepare('DELETE FROM cache_metadata WHERE LOWER(suburb) = LOWER(?)').run(suburb)
  } else {
    db.prepare('DELETE FROM cached_properties').run()
    db.prepare('DELETE FROM cache_metadata').run()
  }
}

/**
 * Comparable Sales Lookup
 *
 * Fetches recent sold property data from homely.com.au for a given suburb.
 * Parses the __NEXT_DATA__ Apollo cache which contains structured listing data
 * including address, sold price, sold date, beds, baths, cars, and photos.
 *
 * Supports pagination (up to 3 pages) and server-side filtering via searchComparables().
 */

import { PropertySale, OnMarketListing } from '@/types/proposal'
import { isApifyAvailable, apifyLookupComparables, apifyLookupOnMarket } from './apify-scraper'
import type { ScrapedSale } from './firecrawl-scraper'

// ─── Local SQLite sold_properties (primary source) ───────────────────────────
let localDbAvailable = false
let getSoldPropertiesBySuburbs: ((suburbs: string[]) => ScrapedSale[]) | null = null

try {
  const propertyCache = require('./property-cache')
  getSoldPropertiesBySuburbs = propertyCache.getSoldPropertiesBySuburbs
  localDbAvailable = typeof getSoldPropertiesBySuburbs === 'function'
  if (localDbAvailable) {
    console.log('[comparables] Local SQLite sold_properties module loaded')
  }
} catch {
  console.log('[comparables] Local sold_properties module not available — will use Apify/homely')
}

/**
 * Convert a ScrapedSale (from local SQLite) to a PropertySale for the API.
 * Includes extra fields (lat, lng, cars, propertyType) used by the wizard components.
 */
function scrapedSaleToPropertySale(sale: ScrapedSale): PropertySale & { lat?: number; lng?: number; cars?: number; propertyType?: string } {
  return {
    address: sale.address,
    price: sale.price,
    date: sale.soldDate,
    bedrooms: sale.bedrooms,
    bathrooms: sale.bathrooms,
    sqft: 0,
    distance: 0,
    url: sale.url,
    imageUrl: sale.imageUrl,
    lat: sale.lat,
    lng: sale.lng,
    cars: sale.carSpaces,
    propertyType: sale.propertyType,
  }
}

interface AddressParts {
  streetNumber?: string
  streetName?: string
  suburb: string
  state: string
  postcode: string
}

// Casey/Cardinia suburb → postcode lookup for addresses without state/postcode
const SUBURB_POSTCODES: Record<string, string> = {
  'berwick': '3806', 'narre warren': '3805', 'narre warren north': '3804',
  'narre warren south': '3805', 'pakenham': '3810', 'officer': '3809',
  'beaconsfield': '3807', 'beaconsfield upper': '3808',
  'cranbourne': '3977', 'cranbourne east': '3977', 'cranbourne west': '3977',
  'cranbourne north': '3977', 'cranbourne south': '3977',
  'clyde': '3978', 'clyde north': '3978',
  'hampton park': '3976', 'hallam': '3803', 'endeavour hills': '3802',
  'lynbrook': '3975', 'lyndhurst': '3975', 'doveton': '3177',
  'fountain gate': '3805', 'eumemmerring': '3177',
  'cardinia': '3978', 'nar nar goon': '3812', 'tynong': '3813',
  'garfield': '3814', 'bunyip': '3815', 'lang lang': '3984',
  'koo wee rup': '3981', 'drouin': '3818', 'warragul': '3820',
  'pakenham upper': '3810', 'cockatoo': '3781', 'gembrook': '3783',
  'emerald': '3782', 'upper beaconsfield': '3808',
  'noble park': '3174', 'noble park north': '3174',
  'keysborough': '3173', 'dandenong': '3175', 'dandenong south': '3175',
}

/**
 * Neighboring suburbs within ~3-5km for the Casey/Cardinia corridor.
 * Used to widen comparable sales searches to adjacent suburbs.
 */
export const NEIGHBORING_SUBURBS: Record<string, string[]> = {
  'berwick': ['narre warren', 'narre warren south', 'beaconsfield', 'officer', 'hampton park', 'clyde north', 'fountain gate', 'hallam', 'endeavour hills'],
  'narre warren': ['berwick', 'narre warren north', 'narre warren south', 'fountain gate', 'hallam', 'hampton park', 'endeavour hills', 'doveton', 'eumemmerring'],
  'narre warren north': ['narre warren', 'berwick', 'endeavour hills', 'hallam', 'fountain gate', 'hampton park'],
  'narre warren south': ['narre warren', 'berwick', 'hampton park', 'cranbourne north', 'fountain gate', 'clyde north', 'lynbrook'],
  'pakenham': ['officer', 'beaconsfield', 'pakenham upper', 'nar nar goon', 'cardinia', 'clyde north'],
  'officer': ['pakenham', 'beaconsfield', 'berwick', 'clyde north', 'cardinia', 'beaconsfield upper'],
  'beaconsfield': ['berwick', 'officer', 'beaconsfield upper', 'clyde north', 'narre warren south', 'hampton park'],
  'beaconsfield upper': ['beaconsfield', 'officer', 'upper beaconsfield', 'pakenham upper', 'emerald', 'cockatoo'],
  'cranbourne': ['cranbourne east', 'cranbourne west', 'cranbourne north', 'cranbourne south', 'hampton park', 'lynbrook', 'lyndhurst', 'clyde'],
  'cranbourne east': ['cranbourne', 'cranbourne north', 'cranbourne south', 'clyde', 'clyde north'],
  'cranbourne west': ['cranbourne', 'cranbourne north', 'lynbrook', 'lyndhurst', 'hampton park'],
  'cranbourne north': ['cranbourne', 'cranbourne east', 'cranbourne west', 'narre warren south', 'hampton park', 'clyde north', 'lynbrook'],
  'cranbourne south': ['cranbourne', 'cranbourne east', 'clyde', 'lang lang', 'koo wee rup'],
  'clyde': ['clyde north', 'cranbourne east', 'cranbourne south', 'cardinia'],
  'clyde north': ['clyde', 'cranbourne east', 'cranbourne north', 'berwick', 'narre warren south', 'officer', 'beaconsfield', 'cardinia'],
  'hampton park': ['narre warren', 'narre warren south', 'cranbourne', 'cranbourne north', 'cranbourne west', 'lynbrook', 'hallam', 'berwick'],
  'hallam': ['narre warren', 'narre warren north', 'hampton park', 'endeavour hills', 'doveton', 'eumemmerring', 'lynbrook', 'fountain gate'],
  'endeavour hills': ['narre warren', 'narre warren north', 'hallam', 'doveton', 'eumemmerring'],
  'lynbrook': ['lyndhurst', 'cranbourne west', 'cranbourne north', 'hampton park', 'hallam', 'narre warren south'],
  'lyndhurst': ['lynbrook', 'cranbourne west', 'cranbourne', 'hampton park', 'keysborough', 'dandenong south'],
  'doveton': ['hallam', 'endeavour hills', 'eumemmerring', 'dandenong', 'noble park'],
  'fountain gate': ['narre warren', 'narre warren south', 'narre warren north', 'berwick', 'hallam'],
  'eumemmerring': ['doveton', 'hallam', 'dandenong', 'endeavour hills', 'noble park'],
  'cardinia': ['clyde', 'clyde north', 'officer', 'pakenham', 'nar nar goon'],
  'nar nar goon': ['pakenham', 'cardinia', 'tynong', 'officer'],
  'tynong': ['nar nar goon', 'garfield', 'pakenham', 'bunyip'],
  'garfield': ['tynong', 'bunyip', 'nar nar goon'],
  'bunyip': ['garfield', 'tynong', 'drouin', 'lang lang'],
  'lang lang': ['koo wee rup', 'cranbourne south', 'bunyip'],
  'koo wee rup': ['lang lang', 'cranbourne south'],
  'drouin': ['warragul', 'bunyip'],
  'warragul': ['drouin'],
  'pakenham upper': ['pakenham', 'beaconsfield upper', 'officer', 'cockatoo', 'gembrook'],
  'cockatoo': ['emerald', 'gembrook', 'beaconsfield upper', 'pakenham upper', 'upper beaconsfield'],
  'gembrook': ['cockatoo', 'emerald', 'pakenham upper', 'beaconsfield upper'],
  'emerald': ['cockatoo', 'gembrook', 'beaconsfield upper', 'upper beaconsfield'],
  'upper beaconsfield': ['beaconsfield upper', 'beaconsfield', 'officer', 'emerald', 'cockatoo'],
  'noble park': ['noble park north', 'dandenong', 'keysborough', 'doveton', 'eumemmerring'],
  'noble park north': ['noble park', 'dandenong', 'endeavour hills', 'doveton'],
  'keysborough': ['noble park', 'dandenong south', 'lyndhurst', 'dandenong'],
  'dandenong': ['dandenong south', 'noble park', 'noble park north', 'keysborough', 'doveton', 'eumemmerring'],
  'dandenong south': ['dandenong', 'keysborough', 'lyndhurst'],
}

/**
 * Parse an Australian address into parts.
 * E.g. "42 Smith St, Brighton VIC 3186" → { suburb: "brighton", state: "vic", postcode: "3186" }
 * Also handles addresses without state/postcode for known Casey/Cardinia suburbs.
 */
export function parseAddress(address: string): AddressParts | null {
  // Extract state + postcode from the end first
  const statePostMatch = address.match(
    /\s*,?\s*(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s+(\d{4})\s*$/i
  )
  if (statePostMatch) {
    const state = statePostMatch[1].toLowerCase()
    const postcode = statePostMatch[2]
    const beforeState = address.substring(0, statePostMatch.index).trim()

    // Split on comma to separate street from suburb
    // "52 Harkaway Rd, Berwick" → ["52 Harkaway Rd", "Berwick"]
    // "42 Smith St Brighton" → ["42 Smith St Brighton"] (no comma, use last word as suburb)
    const commaParts = beforeState.split(',').map(s => s.trim()).filter(Boolean)

    if (commaParts.length >= 2) {
      // Has comma: street part, suburb part
      const streetPart = commaParts.slice(0, -1).join(', ').trim()
      const suburb = commaParts[commaParts.length - 1].trim().toLowerCase()
      const streetNum = streetPart.match(/^(\d+[A-Za-z]?)/)
      const streetName = streetPart.replace(/^\d+[A-Za-z]?\s*/, '').trim().toLowerCase()

      return {
        streetNumber: streetNum?.[1],
        streetName: streetName || undefined,
        suburb,
        state,
        postcode,
      }
    }

    // No comma: try to separate street from suburb by known patterns
    // "42 Smith St Brighton" — suburb is the last word(s) after the street type
    const words = beforeState.split(/\s+/)
    if (words.length >= 3) {
      // Check if any word is a street type, suburb is everything after it
      const streetTypes = ['st', 'street', 'rd', 'road', 'ave', 'avenue', 'dr', 'drive',
        'cres', 'crescent', 'ct', 'court', 'pl', 'place', 'ln', 'lane', 'tce', 'terrace',
        'pde', 'parade', 'cct', 'circuit', 'cl', 'close', 'bvd', 'boulevard', 'blvd',
        'hwy', 'highway', 'way', 'gr', 'grove', 'gv', 'pk', 'park', 'rise', 'mews',
        'esp', 'esplanade']

      for (let i = words.length - 2; i >= 1; i--) {
        if (streetTypes.includes(words[i].toLowerCase())) {
          const streetPart = words.slice(0, i + 1).join(' ')
          const suburb = words.slice(i + 1).join(' ').toLowerCase()
          const streetNum = streetPart.match(/^(\d+[A-Za-z]?)/)
          const streetName = streetPart.replace(/^\d+[A-Za-z]?\s*/, '').trim().toLowerCase()

          return {
            streetNumber: streetNum?.[1],
            streetName: streetName || undefined,
            suburb,
            state,
            postcode,
          }
        }
      }
    }

    // Last resort: whole thing before state is the suburb (no street info)
    return {
      suburb: beforeState.trim().toLowerCase(),
      state,
      postcode,
    }
  }

  // Without state/postcode: "Brighton VIC 3186" already handled above
  // Try suburb-only match
  const suburbMatch = address.match(
    /([A-Za-z][A-Za-z\s]*?)\s+(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s+(\d{4})\s*$/i
  )
  if (suburbMatch) {
    return {
      suburb: suburbMatch[1].trim().toLowerCase(),
      state: suburbMatch[2].toLowerCase(),
      postcode: suburbMatch[3],
    }
  }

  // No state/postcode — try to detect suburb from known Casey/Cardinia list
  const cleaned = address.replace(/[,]/g, ' ').replace(/\s+/g, ' ').trim()
  const words = cleaned.split(' ')

  // Try the whole input as a suburb name first (e.g. just "Berwick" or "Narre Warren")
  const wholeAsSuburb = cleaned.toLowerCase()
  if (SUBURB_POSTCODES[wholeAsSuburb]) {
    return {
      suburb: wholeAsSuburb,
      state: 'vic',
      postcode: SUBURB_POSTCODES[wholeAsSuburb],
    }
  }

  // Try last 1, 2, or 3 words as suburb name: "17 Juliet Gardens, Pakenham" → "Pakenham"
  for (let n = 3; n >= 1; n--) {
    if (words.length < n + 1) continue
    const candidate = words.slice(-n).join(' ').toLowerCase()
    const postcode = SUBURB_POSTCODES[candidate]
    if (postcode) {
      const streetParts = words.slice(0, -n).join(' ')
      const streetNum = streetParts.match(/^(\d+[A-Za-z]?)/)
      const streetName = streetParts.replace(/^\d+[A-Za-z]?\s*/, '').trim().toLowerCase()
      return {
        streetNumber: streetNum?.[1],
        streetName: streetName || undefined,
        suburb: candidate,
        state: 'vic',
        postcode,
      }
    }
  }

  console.error(`[comparables] Could not parse address: ${address}`)
  return null
}

// Apollo cache listing shape from homely.com.au
interface HomelyListing {
  __typename: string
  id: number
  statusType: string
  listingType: string
  uri: string
  canonicalUri: string
  priceDetails?: {
    longDescription?: string
    shortDescription?: string
  }
  address?: {
    streetAddress?: string
    longAddress?: string
  }
  location?: {
    address?: string
    latLong?: { latitude: number; longitude: number }
  }
  saleDetails?: {
    soldDetails?: {
      soldOn?: string
      displayPrice?: {
        longDescription?: string
      }
    }
  }
  features?: {
    bedrooms?: number
    bathrooms?: number
    cars?: number
    landSize?: number
    landSizeUnit?: string
  }
  statusLabels?: {
    propertyTypeDescription?: string
  }
  media?: {
    photos?: Array<{
      webDefaultURI?: string
      webHeroURI?: string
    }>
  }
}

/** Delay helper for respectful pagination */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Fetch a single page of listings from homely.com.au.
 * Returns the parsed listings from the Apollo cache.
 */
async function fetchHomelyPage(baseUrl: string, page: number, type: 'sold' | 'buy'): Promise<HomelyListing[]> {
  const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`
  console.log(`[comparables] Fetching page ${page}: ${url}`)

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  })

  if (!res.ok) {
    console.error(`[comparables] homely returned ${res.status} for page ${page}`)
    return []
  }

  const html = await res.text()

  // Extract __NEXT_DATA__ Apollo cache
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!nextDataMatch) {
    console.error(`[comparables] No __NEXT_DATA__ found on page ${page}`)
    return []
  }

  try {
    const data = JSON.parse(nextDataMatch[1])
    const apollo = data?.props?.pageProps?.initialApolloState
    if (!apollo) return []

    // Extract all Listing: entries
    const listings: HomelyListing[] = []
    for (const key of Object.keys(apollo)) {
      if (key.startsWith('Listing:')) {
        const listing = apollo[key] as HomelyListing
        const isMatch = type === 'sold'
          ? (listing.statusType === 'completed' && listing.listingType === 'sale')
          : (['current', 'available'].includes(listing.statusType) && listing.listingType === 'sale')
        if (isMatch) {
          listings.push(listing)
        }
      }
    }

    return listings
  } catch (err) {
    console.error(`[comparables] Failed to parse __NEXT_DATA__ on page ${page}:`, err)
    return []
  }
}

/**
 * Fetch listings from homely.com.au for a suburb with pagination.
 * Fetches up to maxPages pages with a 1-second delay between requests.
 * @param type 'sold' for completed sales, 'buy' for current on-market listings
 * @param maxPages Maximum number of pages to fetch (default 10, stops when no new results)
 */
async function fetchHomelyListings(parts: AddressParts, type: 'sold' | 'buy' = 'sold', maxPages: number = 10): Promise<HomelyListing[]> {
  const suburbSlug = parts.suburb.replace(/\s+/g, '-')
  let baseUrl: string
  if (type === 'sold') {
    baseUrl = `https://www.homely.com.au/sold-properties/${suburbSlug}-${parts.state}-${parts.postcode}`
  } else {
    baseUrl = `https://www.homely.com.au/for-sale/${suburbSlug}-${parts.state}-${parts.postcode}/real-estate`
  }

  const allListings: HomelyListing[] = []
  const seenIds = new Set<number>()

  for (let page = 1; page <= maxPages; page++) {
    // Delay between pages (not before the first request)
    if (page > 1) {
      await delay(1000)
    }

    try {
      const pageListings = await fetchHomelyPage(baseUrl, page, type)

      if (pageListings.length === 0) {
        console.log(`[comparables] Page ${page} returned 0 results, stopping pagination`)
        break
      }

      // Deduplicate by listing ID
      let newCount = 0
      for (const listing of pageListings) {
        if (!seenIds.has(listing.id)) {
          seenIds.add(listing.id)
          allListings.push(listing)
          newCount++
        }
      }

      console.log(`[comparables] Page ${page}: ${pageListings.length} listings (${newCount} new)`)

      // If we got fewer new listings than expected, probably no more pages
      if (newCount === 0) {
        console.log(`[comparables] No new listings on page ${page}, stopping pagination`)
        break
      }
    } catch (err) {
      console.error(`[comparables] Failed to fetch page ${page}:`, err)
      break
    }
  }

  console.log(`[comparables] Total unique listings across all pages: ${allListings.length}`)
  return allListings
}

/**
 * Extended comparable sale result with additional fields parsed from homely.
 */
export interface ComparableResult {
  address: string
  price: number
  bedrooms: number
  bathrooms: number
  carSpaces: number
  propertyType: string
  landSize: string | null
  soldDate: string
  link: string
  imageUrl?: string
  lat?: number
  lng?: number
  // Also include fields for backward compat with PropertySale
  date: string
  sqft: number
  distance: number
  url: string
  cars?: number
}

/**
 * Convert a homely listing to a ComparableResult with all parsed fields.
 */
function listingToComparable(listing: HomelyListing): ComparableResult | null {
  const address = listing.address?.longAddress || listing.location?.address || ''
  if (!address) return null

  // Parse price from "$1,234,567" format
  const priceStr =
    listing.saleDetails?.soldDetails?.displayPrice?.longDescription ||
    listing.priceDetails?.longDescription ||
    ''

  if (priceStr.toLowerCase().includes('undisclosed') || priceStr.toLowerCase().includes('contact')) {
    return null // Skip undisclosed prices
  }

  const price = parseInt(priceStr.replace(/[^0-9]/g, ''))
  if (!price || price < 50000) return null

  const soldDate = listing.saleDetails?.soldDetails?.soldOn || ''
  const imageUrl = listing.media?.photos?.[0]?.webDefaultURI || undefined
  const latLong = listing.location?.latLong

  // Parse land size — homely stores it as a number in m² in features
  let landSize: string | null = null
  if (listing.features?.landSize && listing.features.landSize > 0) {
    const unit = listing.features.landSizeUnit || 'm²'
    landSize = `${listing.features.landSize}${unit}`
  }

  const link = listing.canonicalUri
    ? `https://www.homely.com.au${listing.canonicalUri}`
    : ''

  return {
    address,
    price,
    bedrooms: listing.features?.bedrooms || 0,
    bathrooms: listing.features?.bathrooms || 0,
    carSpaces: listing.features?.cars || 0,
    propertyType: listing.statusLabels?.propertyTypeDescription || 'House',
    landSize,
    soldDate: soldDate ? soldDate.split('T')[0] : '',
    link,
    imageUrl,
    lat: latLong?.latitude,
    lng: latLong?.longitude,
    // Backward compat fields
    date: soldDate ? soldDate.split('T')[0] : '',
    sqft: 0,
    distance: 0,
    url: link,
    cars: listing.features?.cars || 0,
  }
}

/**
 * Convert a homely listing to our PropertySale type.
 * Now includes lat/long, cars, and propertyType for filtering.
 */
function listingToSale(listing: HomelyListing): (PropertySale & { lat?: number; lng?: number; cars?: number; propertyType?: string }) | null {
  const result = listingToComparable(listing)
  if (!result) return null

  return {
    address: result.address,
    price: result.price,
    date: result.date,
    bedrooms: result.bedrooms,
    bathrooms: result.bathrooms,
    sqft: result.sqft,
    distance: result.distance,
    url: result.url,
    imageUrl: result.imageUrl,
    lat: result.lat,
    lng: result.lng,
    cars: result.carSpaces,
    propertyType: result.propertyType,
  }
}

// Track which data source was last used (exposed via getLastSource)
let _lastSource = 'none'

/**
 * Get the data source used by the last lookup call.
 * Returns 'apify', 'homely', or 'none'.
 */
export function getLastSource(): string {
  return _lastSource
}

/**
 * Main entry point: look up comparable sales for a property address.
 * PRIMARY: Local SQLite sold_properties table
 * FALLBACK 1: Apify (realestate.com.au)
 * FALLBACK 2: homely.com.au
 * Returns up to 50 recent sales from the same suburb + neighbors.
 */
export async function lookupComparables(propertyAddress: string): Promise<PropertySale[]> {
  const parts = parseAddress(propertyAddress)
  if (!parts) {
    console.error(`[comparables] Could not parse address: ${propertyAddress}`)
    _lastSource = 'none'
    return []
  }

  // ── Step 1: Try local SQLite sold_properties (primary source) ──────────
  if (localDbAvailable && getSoldPropertiesBySuburbs) {
    try {
      const neighbors = NEIGHBORING_SUBURBS[parts.suburb] || []
      const allSuburbs = [parts.suburb, ...neighbors]
      console.log(`[comparables] Trying local DB (primary) for: ${parts.suburb} + ${neighbors.length} neighbors`)

      const localSales = getSoldPropertiesBySuburbs(allSuburbs)
      console.log(`[comparables] Local DB returned ${localSales.length} sold results`)

      if (localSales.length >= 5) {
        _lastSource = 'local-db'
        let sales = localSales.map(scrapedSaleToPropertySale)

        // Sort: same street first, then by date (newest first)
        if (parts.streetName) {
          const streetLower = parts.streetName.toLowerCase()
          sales.sort((a, b) => {
            const aOnStreet = a.address.toLowerCase().includes(streetLower) ? 1 : 0
            const bOnStreet = b.address.toLowerCase().includes(streetLower) ? 1 : 0
            if (aOnStreet !== bOnStreet) return bOnStreet - aOnStreet
            return new Date(b.date).getTime() - new Date(a.date).getTime()
          })
        }

        sales = sales.slice(0, 50)
        console.log(`[comparables] Returning ${sales.length} comparable sales (source: local-db)`)
        return sales
      }
      console.log(`[comparables] Local DB has < 5 results — falling back to Apify/homely`)
    } catch (err) {
      console.error('[comparables] Local DB lookup failed, falling back to Apify/homely:', err)
    }
  }

  // ── Step 2: Try Apify (first fallback) ─────────────────────────────────
  if (isApifyAvailable()) {
    console.log(`[comparables] Trying Apify (fallback 1) for: ${propertyAddress}`)
    try {
      const apifySales = await apifyLookupComparables(propertyAddress)
      if (apifySales.length > 0) {
        console.log(`[comparables] Apify returned ${apifySales.length} sold results — using as fallback source`)
        _lastSource = 'apify'
        return apifySales
      }
      console.log(`[comparables] Apify returned 0 results — falling back to homely`)
    } catch (err) {
      console.error('[comparables] Apify failed, falling back to homely:', err)
    }
  }

  // ── Step 3: Fallback to homely.com.au — search primary suburb + neighbors
  _lastSource = 'homely'
  console.log(`[comparables] Looking up comparables via homely (fallback) for: ${propertyAddress}`)
  console.log(`[comparables] Suburb: ${parts.suburb}, State: ${parts.state}, Postcode: ${parts.postcode}`)

  // Fetch primary suburb
  const listings = await fetchHomelyListings(parts).catch((err) => {
    console.error('[comparables] Homely fetch failed:', err)
    return [] as HomelyListing[]
  })
  console.log(`[comparables] Homely found ${listings.length} sold listings for ${parts.suburb}`)

  // Also fetch neighboring suburbs (parallel, max 3 neighbors to stay respectful)
  const neighbors = NEIGHBORING_SUBURBS[parts.suburb] || []
  const neighborListings: HomelyListing[] = []
  if (neighbors.length > 0) {
    const neighborSuburbs = neighbors.slice(0, 3)
    console.log(`[comparables] Also searching neighbors: ${neighborSuburbs.join(', ')}`)

    const neighborResults = await Promise.all(
      neighborSuburbs.map(async (neighborSuburb) => {
        const neighborPostcode = SUBURB_POSTCODES[neighborSuburb]
        if (!neighborPostcode) return []
        const neighborParts: AddressParts = {
          suburb: neighborSuburb,
          state: parts.state,
          postcode: neighborPostcode,
        }
        try {
          return await fetchHomelyListings(neighborParts, 'sold', 3)
        } catch {
          return []
        }
      })
    )
    for (const result of neighborResults) {
      neighborListings.push(...result)
    }
    console.log(`[comparables] Neighbors returned ${neighborListings.length} additional listings`)
  }

  // Combine and deduplicate by listing ID
  const allListings = [...listings, ...neighborListings]
  const seenIds = new Set<number>()
  const uniqueListings = allListings.filter(l => {
    if (seenIds.has(l.id)) return false
    seenIds.add(l.id)
    return true
  })

  console.log(`[comparables] Total unique listings: ${uniqueListings.length}`)

  // Convert to PropertySale[], filtering out undisclosed prices
  let sales = uniqueListings
    .map(listingToSale)
    .filter((s): s is PropertySale => s !== null)

  // Sort: same street first, then by date (newest first)
  if (parts.streetName) {
    const streetLower = parts.streetName.toLowerCase()
    sales.sort((a, b) => {
      const aOnStreet = a.address.toLowerCase().includes(streetLower) ? 1 : 0
      const bOnStreet = b.address.toLowerCase().includes(streetLower) ? 1 : 0
      if (aOnStreet !== bOnStreet) return bOnStreet - aOnStreet
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
  }

  sales = sales.slice(0, 50)
  console.log(`[comparables] Returning ${sales.length} comparable sales (source: ${_lastSource})`)

  return sales
}

/**
 * Convert a homely listing to an OnMarketListing (currently for sale).
 * Now includes lat/long for distance filtering.
 */
function listingToOnMarket(listing: HomelyListing): (OnMarketListing & { lat?: number; lng?: number }) | null {
  const address = listing.address?.longAddress || listing.location?.address || ''
  if (!address) return null

  const askingPrice =
    listing.priceDetails?.longDescription ||
    listing.priceDetails?.shortDescription ||
    'Contact Agent'

  const imageUrl = listing.media?.photos?.[0]?.webDefaultURI || undefined
  const latLong = listing.location?.latLong

  return {
    address,
    askingPrice,
    bedrooms: listing.features?.bedrooms || 0,
    bathrooms: listing.features?.bathrooms || 0,
    cars: listing.features?.cars || 0,
    propertyType: listing.statusLabels?.propertyTypeDescription || 'House',
    url: listing.canonicalUri
      ? `https://www.homely.com.au${listing.canonicalUri}`
      : '',
    imageUrl,
    lat: latLong?.latitude,
    lng: latLong?.longitude,
  }
}

/**
 * Look up properties currently on the market in the same suburb.
 * PRIMARY: Apify (realestate.com.au) — FALLBACK: homely.com.au
 * Returns up to 30 current listings.
 */
export async function lookupOnMarket(propertyAddress: string): Promise<OnMarketListing[]> {
  const parts = parseAddress(propertyAddress)
  if (!parts) {
    console.error(`[on-market] Could not parse address: ${propertyAddress}`)
    return []
  }

  // Try Apify first (primary source)
  if (isApifyAvailable()) {
    console.log(`[on-market] Trying Apify (primary) for: ${propertyAddress}`)
    try {
      const apifyListings = await apifyLookupOnMarket(propertyAddress)
      if (apifyListings.length > 0) {
        console.log(`[on-market] Apify returned ${apifyListings.length} on-market results — using as primary source`)
        _lastSource = 'apify'
        return apifyListings
      }
      console.log(`[on-market] Apify returned 0 results — falling back to homely`)
    } catch (err) {
      console.error('[on-market] Apify failed, falling back to homely:', err)
    }
  }

  // Fallback: homely.com.au — search primary suburb + neighbors
  _lastSource = 'homely'
  console.log(`[on-market] Looking up current listings via homely (fallback) for: ${propertyAddress}`)

  const listings = await fetchHomelyListings(parts, 'buy').catch((err) => {
    console.error('[on-market] Fetch failed:', err)
    return [] as HomelyListing[]
  })
  console.log(`[on-market] Homely found ${listings.length} current listings for ${parts.suburb}`)

  // Also fetch neighboring suburbs
  const neighbors = NEIGHBORING_SUBURBS[parts.suburb] || []
  const neighborListings: HomelyListing[] = []
  if (neighbors.length > 0) {
    const neighborSuburbs = neighbors.slice(0, 3)
    console.log(`[on-market] Also searching neighbors: ${neighborSuburbs.join(', ')}`)

    const neighborResults = await Promise.all(
      neighborSuburbs.map(async (neighborSuburb) => {
        const neighborPostcode = SUBURB_POSTCODES[neighborSuburb]
        if (!neighborPostcode) return []
        const neighborParts: AddressParts = {
          suburb: neighborSuburb,
          state: parts.state,
          postcode: neighborPostcode,
        }
        try {
          return await fetchHomelyListings(neighborParts, 'buy', 3)
        } catch {
          return []
        }
      })
    )
    for (const result of neighborResults) {
      neighborListings.push(...result)
    }
    console.log(`[on-market] Neighbors returned ${neighborListings.length} additional listings`)
  }

  // Combine and deduplicate
  const allListings = [...listings, ...neighborListings]
  const seenIds = new Set<number>()
  const uniqueListings = allListings.filter(l => {
    if (seenIds.has(l.id)) return false
    seenIds.add(l.id)
    return true
  })

  const onMarket = uniqueListings
    .map(listingToOnMarket)
    .filter((l): l is (OnMarketListing & { lat?: number; lng?: number }) => l !== null)
    .slice(0, 50)

  console.log(`[on-market] Returning ${onMarket.length} on-market listings (source: ${_lastSource})`)
  return onMarket
}

// ─── Server-side filtering via searchComparables ─────────────────────────────

export interface SearchFilters {
  suburb?: string
  minPrice?: number
  maxPrice?: number
  minBedrooms?: number
  minBathrooms?: number
  minCarSpaces?: number
  propertyType?: string
  saleDateMonths?: number // e.g. 3, 6, 12, 24 — only sold within last N months
  sortBy?: 'price_asc' | 'price_desc' | 'date_newest' | 'date_oldest' | 'bedrooms_asc' | 'bedrooms_desc'
}

/**
 * Convert a PropertySale (from Apify) to a ComparableResult for searchComparables compatibility.
 */
function saleToComparable(sale: PropertySale & { cars?: number; landSize?: number; propertyType?: string }): ComparableResult {
  const landSizeVal = sale.landSize || sale.sqft
  return {
    address: sale.address,
    price: sale.price,
    bedrooms: sale.bedrooms,
    bathrooms: sale.bathrooms,
    carSpaces: sale.cars || 0,
    propertyType: sale.propertyType || 'House',
    landSize: landSizeVal ? `${landSizeVal}m²` : null,
    soldDate: sale.date,
    link: sale.url,
    imageUrl: sale.imageUrl,
    date: sale.date,
    sqft: sale.sqft,
    distance: sale.distance,
    url: sale.url,
    cars: sale.cars || 0,
  }
}

/**
 * Convert an OnMarketListing (from Apify) to a ComparableResult for searchComparables compatibility.
 */
function onMarketToComparable(listing: OnMarketListing): ComparableResult {
  const priceNum = parseInt(listing.askingPrice.replace(/[^0-9]/g, '')) || 0
  return {
    address: listing.address,
    price: priceNum,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    carSpaces: listing.cars || 0,
    propertyType: listing.propertyType || 'House',
    landSize: null,
    soldDate: '',
    link: listing.url,
    imageUrl: listing.imageUrl,
    date: '',
    sqft: 0,
    distance: 0,
    url: listing.url,
    cars: listing.cars || 0,
  }
}

/**
 * Enhanced comparable search with server-side filtering and sorting.
 * PRIMARY: Apify (realestate.com.au) — FALLBACK: homely.com.au
 *
 * 1. Tries Apify first, falls back to homely if needed
 * 2. Applies filters server-side (price range, bedrooms, bathrooms, car spaces, property type, sale date)
 * 3. Sorts results based on sortBy parameter
 * 4. Returns filtered + sorted ComparableResult[]
 */
export async function searchComparables(
  address: string,
  type: 'sold' | 'buy',
  filters?: SearchFilters
): Promise<ComparableResult[]> {
  const parts = parseAddress(address)
  if (!parts) {
    console.error(`[searchComparables] Could not parse address: ${address}`)
    return []
  }

  console.log(`[searchComparables] Searching ${type} for: ${address}`)
  if (filters) {
    console.log(`[searchComparables] Filters:`, JSON.stringify(filters))
  }

  let results: ComparableResult[] = []
  let source = 'homely'

  // Try local SQLite first (primary source) — only for sold type
  if (type === 'sold' && localDbAvailable && getSoldPropertiesBySuburbs) {
    try {
      const neighbors = NEIGHBORING_SUBURBS[parts.suburb] || []
      const allSuburbs = [parts.suburb, ...neighbors]
      console.log(`[searchComparables] Trying local DB (primary) for: ${parts.suburb} + ${neighbors.length} neighbors`)

      const localSales = getSoldPropertiesBySuburbs(allSuburbs)
      if (localSales.length >= 5) {
        results = localSales.map((sale) => ({
          address: sale.address,
          price: sale.price,
          bedrooms: sale.bedrooms,
          bathrooms: sale.bathrooms,
          carSpaces: sale.carSpaces,
          propertyType: sale.propertyType,
          landSize: sale.landSize || null,
          soldDate: sale.soldDate,
          link: sale.url,
          imageUrl: sale.imageUrl,
          lat: sale.lat,
          lng: sale.lng,
          date: sale.soldDate,
          sqft: 0,
          distance: 0,
          url: sale.url,
          cars: sale.carSpaces,
        }))
        source = 'local-db'
        console.log(`[searchComparables] Local DB returned ${results.length} sold results`)
      } else {
        console.log(`[searchComparables] Local DB has < 5 results — falling back`)
      }
    } catch (err) {
      console.error('[searchComparables] Local DB failed, falling back:', err)
    }
  }

  // Try Apify (fallback 1) if no local DB results
  if (results.length === 0 && isApifyAvailable()) {
    console.log(`[searchComparables] Trying Apify (fallback 1)`)
    try {
      if (type === 'sold') {
        const apifySales = await apifyLookupComparables(address)
        if (apifySales.length > 0) {
          results = apifySales.map(saleToComparable)
          source = 'apify'
          console.log(`[searchComparables] Apify returned ${results.length} sold results`)
        }
      } else {
        const apifyListings = await apifyLookupOnMarket(address)
        if (apifyListings.length > 0) {
          results = apifyListings.map(onMarketToComparable)
          source = 'apify'
          console.log(`[searchComparables] Apify returned ${results.length} buy results`)
        }
      }
    } catch (err) {
      console.error('[searchComparables] Apify failed, falling back to homely:', err)
    }
  }

  // Fallback 2: homely.com.au if nothing else worked
  if (results.length === 0) {
    console.log(`[searchComparables] Using homely (fallback)`)
    source = 'homely'

    const listings = await fetchHomelyListings(parts, type).catch((err) => {
      console.error('[searchComparables] Homely fetch failed:', err)
      return [] as HomelyListing[]
    })

    console.log(`[searchComparables] Homely fetched ${listings.length} raw listings`)

    if (type === 'sold') {
      results = listings
        .map(listingToComparable)
        .filter((r): r is ComparableResult => r !== null)
    } else {
      results = listings
        .map((listing) => {
          const addr = listing.address?.longAddress || listing.location?.address || ''
          if (!addr) return null

          const askingPriceStr =
            listing.priceDetails?.longDescription ||
            listing.priceDetails?.shortDescription ||
            ''

          const priceNum = parseInt(askingPriceStr.replace(/[^0-9]/g, '')) || 0
          const imageUrl = listing.media?.photos?.[0]?.webDefaultURI || undefined
          const latLong = listing.location?.latLong
          let landSize: string | null = null
          if (listing.features?.landSize && listing.features.landSize > 0) {
            const unit = listing.features.landSizeUnit || 'm²'
            landSize = `${listing.features.landSize}${unit}`
          }
          const link = listing.canonicalUri
            ? `https://www.homely.com.au${listing.canonicalUri}`
            : ''

          return {
            address: addr,
            price: priceNum,
            bedrooms: listing.features?.bedrooms || 0,
            bathrooms: listing.features?.bathrooms || 0,
            carSpaces: listing.features?.cars || 0,
            propertyType: listing.statusLabels?.propertyTypeDescription || 'House',
            landSize,
            soldDate: '',
            link,
            imageUrl,
            lat: latLong?.latitude,
            lng: latLong?.longitude,
            date: '',
            sqft: 0,
            distance: 0,
            url: link,
            cars: listing.features?.cars || 0,
          } as ComparableResult
        })
        .filter((r): r is ComparableResult => r !== null)
    }
  }

  _lastSource = source

  // Apply filters if provided
  if (filters) {
    results = applyFilters(results, filters)
  }

  // Apply sorting
  const sortBy = filters?.sortBy || (type === 'sold' ? 'date_newest' : 'price_asc')
  results = applySorting(results, sortBy)

  console.log(`[searchComparables] Returning ${results.length} results after filtering (source: ${source})`)
  return results
}

/**
 * Apply search filters to comparable results.
 */
function applyFilters(results: ComparableResult[], filters: SearchFilters): ComparableResult[] {
  return results.filter((r) => {
    // Price range
    if (filters.minPrice && r.price < filters.minPrice) return false
    if (filters.maxPrice && r.price > filters.maxPrice) return false

    // Bedrooms minimum
    if (filters.minBedrooms && r.bedrooms < filters.minBedrooms) return false

    // Bathrooms minimum
    if (filters.minBathrooms && r.bathrooms < filters.minBathrooms) return false

    // Car spaces minimum
    if (filters.minCarSpaces && r.carSpaces < filters.minCarSpaces) return false

    // Property type (case-insensitive match)
    if (filters.propertyType) {
      const filterType = filters.propertyType.toLowerCase()
      const resultType = r.propertyType.toLowerCase()
      if (!resultType.includes(filterType) && !filterType.includes(resultType)) {
        return false
      }
    }

    // Sale date recency filter — only include sold within last N months
    if (filters.saleDateMonths && r.soldDate) {
      const soldDate = new Date(r.soldDate)
      const cutoff = new Date()
      cutoff.setMonth(cutoff.getMonth() - filters.saleDateMonths)
      if (soldDate < cutoff) return false
    }

    return true
  })
}

/**
 * Sort comparable results by the specified criteria.
 */
function applySorting(results: ComparableResult[], sortBy: string): ComparableResult[] {
  const sorted = [...results]

  switch (sortBy) {
    case 'price_asc':
      sorted.sort((a, b) => a.price - b.price)
      break
    case 'price_desc':
      sorted.sort((a, b) => b.price - a.price)
      break
    case 'date_newest':
      sorted.sort((a, b) => {
        const dateA = a.soldDate ? new Date(a.soldDate).getTime() : 0
        const dateB = b.soldDate ? new Date(b.soldDate).getTime() : 0
        return dateB - dateA
      })
      break
    case 'date_oldest':
      sorted.sort((a, b) => {
        const dateA = a.soldDate ? new Date(a.soldDate).getTime() : 0
        const dateB = b.soldDate ? new Date(b.soldDate).getTime() : 0
        return dateA - dateB
      })
      break
    case 'bedrooms_asc':
      sorted.sort((a, b) => a.bedrooms - b.bedrooms)
      break
    case 'bedrooms_desc':
      sorted.sort((a, b) => b.bedrooms - a.bedrooms)
      break
    default:
      // Default: newest first
      sorted.sort((a, b) => {
        const dateA = a.soldDate ? new Date(a.soldDate).getTime() : 0
        const dateB = b.soldDate ? new Date(b.soldDate).getTime() : 0
        return dateB - dateA
      })
  }

  return sorted
}

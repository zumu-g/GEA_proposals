/**
 * Apify realestate.com.au Scraper Integration
 *
 * Uses azzouzana/real-estate-au-scraper-pro to fetch sold and on-market
 * property data from realestate.com.au via the Apify API.
 *
 * Falls back to homely.com.au scraper if Apify is unavailable.
 */

import { PropertySale, OnMarketListing } from '@/types/proposal'
import { parseAddress } from './comparables-lookup'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN
const ACTOR_ID = 'azzouzana~real-estate-au-scraper-pro'
const APIFY_BASE = 'https://api.apify.com/v2'

// Only scrape suburbs within City of Casey and Cardinia Shire
// Postcodes: Casey 3802-3806, 3975-3978 | Cardinia 3807-3818, 3820, 3840-3842
const CASEY_CARDINIA_POSTCODES = new Set([
  // City of Casey
  '3802', '3803', '3804', '3805', '3806',  // Endeavour Hills, Narre Warren, Berwick
  '3975', '3976', '3977', '3978',          // Lynbrook, Hampton Park, Cranbourne, Clyde
  '3174', '3175',                           // Noble Park, Dandenong South (parts)
  // Cardinia Shire
  '3807', '3808', '3809', '3810', '3811', '3812', '3813', '3814', '3815', '3816', '3818',
  '3820',                                   // Pakenham, Officer, Beaconsfield, Koo Wee Rup, etc.
  '3840', '3841', '3842',                   // Warragul, Drouin (fringe Cardinia)
])

/**
 * Check if an address is within the Casey/Cardinia service area.
 */
export function isInServiceArea(postcode: string): boolean {
  return CASEY_CARDINIA_POSTCODES.has(postcode)
}

interface ApifyPropertyResult {
  // Common fields from realestate.com.au scraper
  address?: string
  fullAddress?: string
  streetAddress?: string
  suburb?: string
  state?: string
  postcode?: string
  price?: string
  priceDetails?: string
  displayPrice?: string
  soldPrice?: string
  soldDate?: string
  propertyType?: string
  bedrooms?: number
  bathrooms?: number
  carSpaces?: number
  parkingSpaces?: number
  landSize?: number
  landArea?: number
  buildingSize?: number
  url?: string
  link?: string
  listingUrl?: string
  imageUrl?: string
  mainImage?: string
  images?: string[]
  photos?: string[]
  daysOnSite?: number
  listedDate?: string
  agentName?: string
  agencyName?: string
  description?: string
  features?: string[]
  [key: string]: unknown
}

/**
 * Build a realestate.com.au search URL for a suburb.
 */
function buildSearchUrl(suburb: string, state: string, postcode: string, type: 'sold' | 'buy'): string {
  const suburbSlug = suburb.toLowerCase().replace(/\s+/g, '+')
  const stateSlug = state.toLowerCase()
  if (type === 'sold') {
    return `https://www.realestate.com.au/sold/in-${suburbSlug},+${stateSlug}+${postcode}/`
  }
  return `https://www.realestate.com.au/buy/in-${suburbSlug},+${stateSlug}+${postcode}/`
}

/**
 * Run the Apify actor synchronously and return dataset items.
 * Uses run-sync-get-dataset-items for simplicity.
 * Timeout: 90 seconds.
 */
async function runApifyActor(searchUrl: string, maxItems: number = 10): Promise<ApifyPropertyResult[]> {
  if (!APIFY_TOKEN) {
    console.warn('[apify] No APIFY_API_TOKEN configured')
    return []
  }

  const url = `${APIFY_BASE}/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&maxItems=${maxItems}`

  console.log(`[apify] Running actor with URL: ${searchUrl}`)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: [{ url: searchUrl }],
      }),
      signal: AbortSignal.timeout(90_000),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`[apify] Actor returned ${res.status}: ${text.slice(0, 200)}`)
      return []
    }

    const data = await res.json()

    // Check for error/rate-limit/maintenance messages
    if (Array.isArray(data) && data.length > 0 && data[0].message) {
      console.warn(`[apify] Actor message: ${data[0].message}`)
      return []
    }

    // Filter out fake/maintenance results (Apify sometimes returns junk URLs)
    if (Array.isArray(data)) {
      return data.filter((item: ApifyPropertyResult) => {
        if (item.message) return false
        if (typeof item.url === 'string' && item.url.includes('bypass')) return false
        return true
      })
    }

    return []
  } catch (err) {
    console.error('[apify] Actor run failed:', err)
    return []
  }
}

/**
 * Extract the best address string from a result.
 */
function getAddress(r: ApifyPropertyResult): string {
  return r.fullAddress || r.address || r.streetAddress ||
    [r.streetAddress, r.suburb, r.state, r.postcode].filter(Boolean).join(', ') || ''
}

/**
 * Parse a price string like "$1,234,567" or "Sold for $1,234,567" into a number.
 */
function parsePrice(priceStr: string | undefined): number {
  if (!priceStr) return 0
  const cleaned = priceStr.replace(/[^0-9]/g, '')
  return parseInt(cleaned) || 0
}

/**
 * Get the best image URL from a result.
 */
function getImage(r: ApifyPropertyResult): string | undefined {
  return r.mainImage || r.imageUrl ||
    (r.images && r.images.length > 0 ? r.images[0] : undefined) ||
    (r.photos && r.photos.length > 0 ? r.photos[0] : undefined)
}

/**
 * Get the listing URL from a result.
 */
function getUrl(r: ApifyPropertyResult): string {
  const raw = r.url || r.link || r.listingUrl || ''
  if (raw.startsWith('http')) return raw
  if (raw.startsWith('/')) return `https://www.realestate.com.au${raw}`
  return raw
}

/**
 * Convert Apify result to PropertySale (for sold properties).
 */
function resultToSale(r: ApifyPropertyResult): PropertySale | null {
  const address = getAddress(r)
  if (!address) return null

  const price = parsePrice(r.soldPrice || r.price || r.displayPrice || r.priceDetails)
  if (!price || price < 50_000) return null

  return {
    address,
    price,
    date: r.soldDate || r.listedDate || '',
    bedrooms: r.bedrooms || 0,
    bathrooms: r.bathrooms || 0,
    sqft: r.landSize || r.landArea || 0,
    distance: 0,
    url: getUrl(r),
    imageUrl: getImage(r),
  }
}

/**
 * Convert Apify result to OnMarketListing (for buy listings).
 */
function resultToOnMarket(r: ApifyPropertyResult): OnMarketListing | null {
  const address = getAddress(r)
  if (!address) return null

  const askingPrice = r.displayPrice || r.price || r.priceDetails || 'Contact Agent'

  return {
    address,
    askingPrice: typeof askingPrice === 'string' ? askingPrice : String(askingPrice),
    bedrooms: r.bedrooms || 0,
    bathrooms: r.bathrooms || 0,
    cars: r.carSpaces || r.parkingSpaces || 0,
    propertyType: r.propertyType || 'House',
    url: getUrl(r),
    imageUrl: getImage(r),
    daysOnMarket: r.daysOnSite,
  }
}

/**
 * Look up comparable sold properties from realestate.com.au via Apify.
 * Returns up to 8 recent sales.
 */
export async function apifyLookupComparables(propertyAddress: string): Promise<PropertySale[]> {
  const parts = parseAddress(propertyAddress)
  if (!parts) {
    console.error(`[apify] Could not parse address: ${propertyAddress}`)
    return []
  }

  if (!isInServiceArea(parts.postcode)) {
    console.log(`[apify] Postcode ${parts.postcode} outside Casey/Cardinia — skipping Apify`)
    return []
  }

  const searchUrl = buildSearchUrl(parts.suburb, parts.state, parts.postcode, 'sold')
  const results = await runApifyActor(searchUrl, 12)

  console.log(`[apify] Got ${results.length} sold results`)

  const sales = results
    .map(resultToSale)
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

  return sales.slice(0, 8)
}

/**
 * Look up properties currently on the market from realestate.com.au via Apify.
 * Returns up to 8 current listings.
 */
export async function apifyLookupOnMarket(propertyAddress: string): Promise<OnMarketListing[]> {
  const parts = parseAddress(propertyAddress)
  if (!parts) {
    console.error(`[apify] Could not parse address: ${propertyAddress}`)
    return []
  }

  if (!isInServiceArea(parts.postcode)) {
    console.log(`[apify] Postcode ${parts.postcode} outside Casey/Cardinia — skipping Apify`)
    return []
  }

  const searchUrl = buildSearchUrl(parts.suburb, parts.state, parts.postcode, 'buy')
  const results = await runApifyActor(searchUrl, 10)

  console.log(`[apify] Got ${results.length} buy results`)

  return results
    .map(resultToOnMarket)
    .filter((l): l is OnMarketListing => l !== null)
    .slice(0, 8)
}

/**
 * Check if Apify is available (token configured).
 */
export function isApifyAvailable(): boolean {
  return !!APIFY_TOKEN
}

/**
 * Comparable Sales Lookup
 *
 * Fetches recent sold property data from homely.com.au for a given suburb.
 * Parses the __NEXT_DATA__ Apollo cache which contains structured listing data
 * including address, sold price, sold date, beds, baths, cars, and photos.
 */

import { PropertySale, OnMarketListing } from '@/types/proposal'
import { isApifyAvailable, apifyLookupComparables, apifyLookupOnMarket } from './apify-scraper'

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
 * Parse an Australian address into parts.
 * E.g. "42 Smith St, Brighton VIC 3186" → { suburb: "brighton", state: "vic", postcode: "3186" }
 * Also handles addresses without state/postcode for known Casey/Cardinia suburbs.
 */
export function parseAddress(address: string): AddressParts | null {
  // Full format: "42 Smith St, Brighton VIC 3186"
  const match = address.match(
    /^(\d+[A-Za-z]?)\s+(.+?)[\s,]+([A-Za-z\s]+?)\s+(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s+(\d{4})\s*$/i
  )
  if (match) {
    return {
      streetNumber: match[1],
      streetName: match[2].trim().toLowerCase(),
      suburb: match[3].trim().toLowerCase(),
      state: match[4].toLowerCase(),
      postcode: match[5],
    }
  }

  // Without street number: "Brighton VIC 3186"
  const suburbMatch = address.match(
    /([A-Za-z\s]+?)\s+(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s+(\d{4})\s*$/i
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

/**
 * Fetch listings from homely.com.au for a suburb.
 * @param type 'sold' for completed sales, 'buy' for current on-market listings
 */
async function fetchHomelyListings(parts: AddressParts, type: 'sold' | 'buy' = 'sold'): Promise<HomelyListing[]> {
  const suburbSlug = parts.suburb.replace(/\s+/g, '-')
  let url: string
  if (type === 'sold') {
    url = `https://www.homely.com.au/sold-properties/${suburbSlug}-${parts.state}-${parts.postcode}`
  } else {
    url = `https://www.homely.com.au/for-sale/${suburbSlug}-${parts.state}-${parts.postcode}/real-estate`
  }

  console.log(`[comparables] Fetching: ${url}`)

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  })

  if (!res.ok) {
    console.error(`[comparables] homely returned ${res.status}`)
    return []
  }

  const html = await res.text()

  // Extract __NEXT_DATA__ Apollo cache
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!nextDataMatch) {
    console.error('[comparables] No __NEXT_DATA__ found')
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
    console.error('[comparables] Failed to parse __NEXT_DATA__:', err)
    return []
  }
}

/**
 * Convert a homely listing to our PropertySale type.
 */
function listingToSale(listing: HomelyListing): PropertySale | null {
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

  return {
    address,
    price,
    date: soldDate ? soldDate.split('T')[0] : '',
    bedrooms: listing.features?.bedrooms || 0,
    bathrooms: listing.features?.bathrooms || 0,
    sqft: 0, // homely doesn't reliably provide land size in the list view
    distance: 0,
    url: listing.canonicalUri
      ? `https://www.homely.com.au${listing.canonicalUri}`
      : '',
    imageUrl,
  }
}

/**
 * Main entry point: look up comparable sales for a property address.
 * Tries Apify (realestate.com.au) first, falls back to homely.com.au.
 * Returns up to 8 recent sales from the same suburb.
 */
export async function lookupComparables(propertyAddress: string): Promise<PropertySale[]> {
  // Use homely.com.au directly (Apify actors are unreliable)
  const parts = parseAddress(propertyAddress)
  if (!parts) {
    console.error(`[comparables] Could not parse address: ${propertyAddress}`)
    return []
  }

  console.log(`[comparables] Looking up comparables via homely for: ${propertyAddress}`)
  console.log(`[comparables] Suburb: ${parts.suburb}, State: ${parts.state}, Postcode: ${parts.postcode}`)

  const listings = await fetchHomelyListings(parts).catch((err) => {
    console.error('[comparables] Fetch failed:', err)
    return [] as HomelyListing[]
  })

  console.log(`[comparables] Found ${listings.length} sold listings`)

  // Convert to PropertySale[], filtering out undisclosed prices
  let sales = listings
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

  sales = sales.slice(0, 8)
  console.log(`[comparables] Returning ${sales.length} comparable sales`)

  return sales
}

/**
 * Convert a homely listing to an OnMarketListing (currently for sale).
 */
function listingToOnMarket(listing: HomelyListing): OnMarketListing | null {
  const address = listing.address?.longAddress || listing.location?.address || ''
  if (!address) return null

  const askingPrice =
    listing.priceDetails?.longDescription ||
    listing.priceDetails?.shortDescription ||
    'Contact Agent'

  const imageUrl = listing.media?.photos?.[0]?.webDefaultURI || undefined

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
  }
}

/**
 * Look up properties currently on the market in the same suburb.
 * Tries Apify (realestate.com.au) first, falls back to homely.com.au.
 * Returns up to 8 current listings.
 */
export async function lookupOnMarket(propertyAddress: string): Promise<OnMarketListing[]> {
  // Use homely.com.au directly
  const parts = parseAddress(propertyAddress)
  if (!parts) {
    console.error(`[on-market] Could not parse address: ${propertyAddress}`)
    return []
  }

  console.log(`[on-market] Looking up current listings via homely for: ${propertyAddress}`)

  const listings = await fetchHomelyListings(parts, 'buy').catch((err) => {
    console.error('[on-market] Fetch failed:', err)
    return [] as HomelyListing[]
  })

  console.log(`[on-market] Found ${listings.length} current listings`)

  const onMarket = listings
    .map(listingToOnMarket)
    .filter((l): l is OnMarketListing => l !== null)
    .slice(0, 8)

  console.log(`[on-market] Returning ${onMarket.length} on-market listings`)
  return onMarket
}

/**
 * Comparable Sales Lookup
 *
 * Fetches recent sold property data from homely.com.au for a given suburb.
 * Parses the __NEXT_DATA__ Apollo cache which contains structured listing data
 * including address, sold price, sold date, beds, baths, cars, and photos.
 */

import { PropertySale } from '@/types/proposal'

interface AddressParts {
  streetNumber?: string
  streetName?: string
  suburb: string
  state: string
  postcode: string
}

/**
 * Parse an Australian address into parts.
 * E.g. "42 Smith St, Brighton VIC 3186" → { suburb: "brighton", state: "vic", postcode: "3186" }
 */
export function parseAddress(address: string): AddressParts | null {
  const match = address.match(
    /^(\d+[A-Za-z]?)\s+(.+?)[\s,]+([A-Za-z\s]+?)\s+(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s+(\d{4})\s*$/i
  )
  if (!match) {
    // Try without street number
    const suburbMatch = address.match(
      /([A-Za-z\s]+?)\s+(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s+(\d{4})\s*$/i
    )
    if (!suburbMatch) return null
    return {
      suburb: suburbMatch[1].trim().toLowerCase(),
      state: suburbMatch[2].toLowerCase(),
      postcode: suburbMatch[3],
    }
  }

  return {
    streetNumber: match[1],
    streetName: match[2].trim().toLowerCase(),
    suburb: match[3].trim().toLowerCase(),
    state: match[4].toLowerCase(),
    postcode: match[5],
  }
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
 * Fetch sold listings from homely.com.au for a suburb.
 */
async function fetchHomelyListings(parts: AddressParts): Promise<HomelyListing[]> {
  const suburbSlug = parts.suburb.replace(/\s+/g, '-')
  const url = `https://www.homely.com.au/sold-properties/${suburbSlug}-${parts.state}-${parts.postcode}`

  console.log(`[comparables] Fetching: ${url}`)

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
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
        if (listing.statusType === 'completed' && listing.listingType === 'sale') {
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
 * Returns up to 8 recent sales from the same suburb, prioritising those
 * on the same street and with disclosed prices.
 */
export async function lookupComparables(propertyAddress: string): Promise<PropertySale[]> {
  const parts = parseAddress(propertyAddress)
  if (!parts) {
    console.error(`[comparables] Could not parse address: ${propertyAddress}`)
    return []
  }

  console.log(`[comparables] Looking up comparables for: ${propertyAddress}`)
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

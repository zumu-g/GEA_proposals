/**
 * Firecrawl-based scraper for realestate.com.au sold and on-market listings.
 * Uses the Firecrawl REST API directly (no SDK) to avoid zod compat issues with Next.js 14.
 */

export interface ScrapedSale {
  address: string
  suburb: string
  state: string
  postcode: string
  price: number
  bedrooms: number
  bathrooms: number
  carSpaces: number
  propertyType: string
  soldDate: string // YYYY-MM-DD
  landSize?: string
  url: string
  imageUrl?: string
  lat?: number
  lng?: number
  source: 'realestate.com.au'
}

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1/scrape'
const RATE_LIMIT_MS = 2000
const DEFAULT_MAX_PAGES = 3
const REA_BASE = 'https://www.realestate.com.au'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isFirecrawlAvailable(): boolean {
  return !!process.env.FIRECRAWL_API_KEY
}

function toSuburbSlug(suburb: string): string {
  return suburb.toLowerCase().trim().replace(/\s+/g, '-')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Upsize reastatic.net thumbnail URLs to 400x300.
 */
function upsizeImageUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined
  return url.replace(/\/\d+x\d+\//, '/400x300/')
}

/**
 * Attempt to parse a price string / number into a numeric value.
 */
function parsePrice(raw: unknown): number {
  if (typeof raw === 'number') return raw
  if (typeof raw !== 'string') return 0
  const cleaned = raw.replace(/[^0-9.]/g, '')
  return cleaned ? parseFloat(cleaned) : 0
}

/**
 * Normalise a date value into YYYY-MM-DD format.
 */
function normaliseSoldDate(raw: unknown): string {
  if (!raw) return ''
  const str = String(raw)

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str

  // Try Date parsing
  const d = new Date(str)
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0]
  }

  // DD/MM/YYYY
  const dmy = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  }

  return str
}

// ---------------------------------------------------------------------------
// Firecrawl fetch
// ---------------------------------------------------------------------------

async function firecrawlScrape(pageUrl: string): Promise<string | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    console.error('[firecrawl] FIRECRAWL_API_KEY is not set')
    return null
  }

  try {
    const res = await fetch(FIRECRAWL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: pageUrl,
        formats: ['html'],
        waitFor: 3000,
        timeout: 30000,
      }),
      signal: AbortSignal.timeout(45000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error(`[firecrawl] API returned ${res.status}: ${errText}`)
      return null
    }

    const json = await res.json()

    if (!json.success) {
      console.error('[firecrawl] API returned success=false:', json.error || json)
      return null
    }

    return json.data?.html || null
  } catch (err: any) {
    console.error(`[firecrawl] Fetch error for ${pageUrl}:`, err.message || err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Parsing from __NEXT_DATA__
// ---------------------------------------------------------------------------

function extractNextData(html: string): any | null {
  const match = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

/**
 * Recursively walk an object looking for listing-like objects.
 */
function findListingObjects(obj: any, results: any[] = [], depth = 0): any[] {
  if (depth > 12 || !obj || typeof obj !== 'object') return results

  // Detect a listing: must have some kind of address AND price-related field
  if (
    (obj.address || obj.prettyAddress || obj.displayAddress) &&
    (obj.price || obj.soldPrice || obj.displayPrice || obj.priceDetails)
  ) {
    results.push(obj)
    return results // don't recurse further inside a listing
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      findListingObjects(item, results, depth + 1)
    }
  } else {
    for (const key of Object.keys(obj)) {
      findListingObjects(obj[key], results, depth + 1)
    }
  }

  return results
}

function extractAddressParts(listing: any): {
  address: string
  suburb: string
  state: string
  postcode: string
} {
  // Some structures nest address as an object
  const addrObj = listing.address && typeof listing.address === 'object' ? listing.address : null

  let address = ''
  let suburb = ''
  let state = ''
  let postcode = ''

  if (addrObj) {
    address =
      addrObj.display ||
      addrObj.full ||
      [addrObj.streetAddress, addrObj.suburb, addrObj.state, addrObj.postcode]
        .filter(Boolean)
        .join(', ')
    suburb = addrObj.suburb || addrObj.locality || ''
    state = addrObj.state || ''
    postcode = addrObj.postcode || ''
  } else {
    address = listing.prettyAddress || listing.displayAddress || String(listing.address || '')
    suburb = listing.suburb || ''
    state = listing.state || ''
    postcode = listing.postcode || ''
  }

  return { address, suburb, state, postcode }
}

function extractFeatures(listing: any): {
  bedrooms: number
  bathrooms: number
  carSpaces: number
} {
  const feat = listing.propertyFeatures || listing.features || listing.generalFeatures || {}
  return {
    bedrooms: Number(feat.bedrooms || feat.beds || listing.bedrooms || listing.beds || 0),
    bathrooms: Number(feat.bathrooms || feat.baths || listing.bathrooms || listing.baths || 0),
    carSpaces: Number(
      feat.parkingSpaces || feat.carSpaces || feat.cars || listing.carSpaces || listing.cars || 0
    ),
  }
}

function extractGeo(listing: any): { lat?: number; lng?: number } {
  const geo = listing.geo || listing.location || listing.geoLocation || {}
  const lat = Number(geo.latitude || geo.lat || listing.latitude || listing.lat) || undefined
  const lng = Number(geo.longitude || geo.lng || geo.lon || listing.longitude || listing.lng) || undefined
  return { lat, lng }
}

function extractImageUrl(listing: any): string | undefined {
  // Try images array
  const images = listing.images || listing.photos || listing.media || []
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0]
    const url = typeof first === 'string' ? first : first?.url || first?.uri || first?.server || ''
    return upsizeImageUrl(url) || undefined
  }
  // Try single image field
  const single = listing.mainImage || listing.heroImage || listing.imageUrl || listing.thumbnailUrl
  return upsizeImageUrl(single) || undefined
}

function listingToScrapedSale(listing: any, fallbackSuburb: string, fallbackState: string, fallbackPostcode: string): ScrapedSale | null {
  const addrParts = extractAddressParts(listing)
  const features = extractFeatures(listing)
  const geo = extractGeo(listing)

  const price = parsePrice(
    listing.soldPrice || listing.price || listing.displayPrice ||
    listing.priceDetails?.displayPrice || listing.priceDetails?.price || 0
  )

  const soldDate = normaliseSoldDate(
    listing.soldDate || listing.dateSold || listing.priceDetails?.soldDate || ''
  )

  const propertyType = listing.propertyType || listing.propertyCategory || listing.type || 'house'

  const listingUrl = listing.url || listing.prettyUrl || listing._links?.prettyUrl?.href || ''
  const fullUrl = listingUrl.startsWith('http') ? listingUrl : `${REA_BASE}${listingUrl}`

  const landSize = listing.landSize || listing.landArea
    ? String(listing.landSize || listing.landArea)
    : undefined

  if (!addrParts.address) return null

  return {
    address: addrParts.address,
    suburb: addrParts.suburb || fallbackSuburb,
    state: (addrParts.state || fallbackState).toUpperCase(),
    postcode: addrParts.postcode || fallbackPostcode,
    price,
    bedrooms: features.bedrooms,
    bathrooms: features.bathrooms,
    carSpaces: features.carSpaces,
    propertyType: propertyType.toLowerCase(),
    soldDate,
    landSize,
    url: fullUrl,
    imageUrl: extractImageUrl(listing),
    lat: geo.lat,
    lng: geo.lng,
    source: 'realestate.com.au',
  }
}

function parseListingsFromNextData(
  html: string,
  fallbackSuburb: string,
  fallbackState: string,
  fallbackPostcode: string
): ScrapedSale[] {
  const nextData = extractNextData(html)
  if (!nextData) return []

  // Look in pageProps first, then the entire object
  const searchRoot = nextData?.props?.pageProps || nextData
  const rawListings = findListingObjects(searchRoot)

  const results: ScrapedSale[] = []
  for (const listing of rawListings) {
    const sale = listingToScrapedSale(listing, fallbackSuburb, fallbackState, fallbackPostcode)
    if (sale) results.push(sale)
  }

  return results
}

// ---------------------------------------------------------------------------
// Fallback: regex extraction from HTML
// ---------------------------------------------------------------------------

function parseListingsFromHtmlFallback(
  html: string,
  fallbackSuburb: string,
  fallbackState: string,
  fallbackPostcode: string
): ScrapedSale[] {
  const results: ScrapedSale[] = []
  const seenAddresses = new Set<string>()

  // REA listing cards are <article> tags with aria-label containing the address
  // Structure: <article aria-label="3 Illowra Court, Berwick" data-testid="ResidentialCard">
  //   ... <span class="property-price ">$803,000</span> ...
  //   ... <span>Sold on 24 Mar 2026</span> ...
  //   ... feature icons for beds/baths/cars ...
  //   ... <p>House</p> or <p>Unit</p> ...
  //   ... reastatic.net image URLs ...

  // Split HTML by article tags to process each listing card
  const articlePattern = /<article[^>]*aria-label="([^"]+)"[^>]*data-testid="ResidentialCard"[^>]*>([\s\S]*?)(?=<\/article>)/g
  const articles = [...html.matchAll(articlePattern)]

  for (const match of articles) {
    const ariaLabel = match[1] // "3 Illowra Court, Berwick"
    const cardHtml = match[2]

    if (seenAddresses.has(ariaLabel)) continue
    seenAddresses.add(ariaLabel)

    // Extract price: <span class="property-price ...">$803,000</span>
    const priceMatch = cardHtml.match(/class="property-price[^"]*"[^>]*>\s*\$?([\d,]+)/)
    const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0
    if (!price || price < 50000) continue // Skip undisclosed/invalid

    // Extract sold date: "Sold on 24 Mar 2026"
    const dateMatch = cardHtml.match(/Sold\s+(?:on\s+)?(\d{1,2}\s+\w+\s+\d{4})/)
    let soldDate = ''
    if (dateMatch) {
      try {
        const d = new Date(dateMatch[1])
        if (!isNaN(d.getTime())) {
          soldDate = d.toISOString().split('T')[0]
        }
      } catch { /* skip */ }
    }

    // Extract beds/baths/cars from <li aria-label="4 bedrooms"> or
    // from the <ul aria-label="House with ... 4 bedrooms 2 bathrooms 2 car spaces">
    const bedsMatch = cardHtml.match(/aria-label="(\d+)\s*bed/i)
      || cardHtml.match(/(\d+)\s*bed/i)
    const bathsMatch = cardHtml.match(/aria-label="(\d+)\s*bath/i)
      || cardHtml.match(/(\d+)\s*bath/i)
    const carsMatch = cardHtml.match(/aria-label="(\d+)\s*car/i)
      || cardHtml.match(/(\d+)\s*car\s*space/i)
      || cardHtml.match(/aria-label="(\d+)\s*parking/i)

    // Extract property type from <ul aria-label="House with ..."> or <p>House</p>
    const ulAriaMatch = cardHtml.match(/aria-label="(House|Unit|Townhouse|Villa|Apartment|Land|Acreage|Rural)\b/i)
    const typeMatch = ulAriaMatch || cardHtml.match(/<p[^>]*>(House|Unit|Townhouse|Villa|Apartment|Land|Acreage|Rural)<\/p>/i)
    const propertyType = typeMatch ? typeMatch[1] : 'House'

    // Extract land size: "471m²"
    const landMatch = cardHtml.match(/([\d,.]+)\s*m²/)
    const landSize = landMatch ? `${landMatch[1]}m²` : undefined

    // Extract image URL (reastatic.net)
    const imgMatch = cardHtml.match(/https:\/\/i\d\.au\.reastatic\.net\/\d+x\d+[^"<>\s]*\/image\.(?:jpg|jpeg|webp|png)/i)
    const imageUrl = imgMatch ? imgMatch[0].replace(/\/\d+x\d+/, '/400x300') : undefined

    // Extract listing URL
    const urlMatch = cardHtml.match(/href="(\/sold\/[^"]+)"/)
      || cardHtml.match(/href="(\/property\/[^"]+)"/)
    const url = urlMatch ? `https://www.realestate.com.au${urlMatch[1]}` : ''

    // Parse suburb from aria-label: "3 Illowra Court, Berwick" → "Berwick"
    const addrParts = ariaLabel.split(',')
    const suburb = addrParts.length >= 2
      ? addrParts[addrParts.length - 1].trim().toLowerCase()
      : fallbackSuburb

    // Build full address with state + postcode
    const fullAddress = `${ariaLabel} ${fallbackState.toUpperCase()} ${fallbackPostcode}`

    results.push({
      address: fullAddress,
      suburb,
      state: fallbackState.toUpperCase(),
      postcode: fallbackPostcode,
      price,
      bedrooms: bedsMatch ? parseInt(bedsMatch[1]) : 0,
      bathrooms: bathsMatch ? parseInt(bathsMatch[1]) : 0,
      carSpaces: carsMatch ? parseInt(carsMatch[1]) : 0,
      propertyType: propertyType.toLowerCase(),
      soldDate,
      landSize,
      url,
      imageUrl,
      source: 'realestate.com.au',
    })
  }

  return results
}

// ---------------------------------------------------------------------------
// Main scrape function — Sold listings
// ---------------------------------------------------------------------------

export async function scrapeSoldListings(
  suburb: string,
  state: string,
  postcode: string,
  maxPages: number = DEFAULT_MAX_PAGES
): Promise<ScrapedSale[]> {
  if (!isFirecrawlAvailable()) {
    console.error('[firecrawl] FIRECRAWL_API_KEY not set — cannot scrape')
    return []
  }

  const slug = toSuburbSlug(suburb)
  const stLower = state.toLowerCase()
  const allListings: ScrapedSale[] = []

  for (let page = 1; page <= maxPages; page++) {
    const pageUrl = `${REA_BASE}/sold/in-${slug},+${stLower}+${postcode}/list-${page}`
    console.log(`[firecrawl] Scraping sold page ${page} for ${suburb}...`)

    const html = await firecrawlScrape(pageUrl)
    if (!html) {
      console.log(`[firecrawl] No HTML returned for page ${page}, stopping.`)
      break
    }

    // Try __NEXT_DATA__ first
    let listings = parseListingsFromNextData(html, suburb, stLower, postcode)

    // Fallback to regex if __NEXT_DATA__ yielded nothing
    if (listings.length === 0) {
      console.log(`[firecrawl] __NEXT_DATA__ parsing found 0 listings, trying HTML fallback...`)
      listings = parseListingsFromHtmlFallback(html, suburb, stLower, postcode)
    }

    console.log(`[firecrawl] Found ${listings.length} listings on page ${page}`)

    allListings.push(...listings)

    // If no listings found, stop paginating
    if (listings.length === 0) break

    // Rate limit between pages
    if (page < maxPages) {
      await sleep(RATE_LIMIT_MS)
    }
  }

  console.log(`[firecrawl] Total sold listings scraped for ${suburb}: ${allListings.length}`)
  return allListings
}

// ---------------------------------------------------------------------------
// On-market (buy) listings
// ---------------------------------------------------------------------------

export async function scrapeOnMarketListings(
  suburb: string,
  state: string,
  postcode: string,
  maxPages: number = DEFAULT_MAX_PAGES
): Promise<ScrapedSale[]> {
  if (!isFirecrawlAvailable()) {
    console.error('[firecrawl] FIRECRAWL_API_KEY not set — cannot scrape')
    return []
  }

  const slug = toSuburbSlug(suburb)
  const stLower = state.toLowerCase()
  const allListings: ScrapedSale[] = []

  for (let page = 1; page <= maxPages; page++) {
    const pageUrl = `${REA_BASE}/buy/in-${slug},+${stLower}+${postcode}/list-${page}`
    console.log(`[firecrawl] Scraping on-market page ${page} for ${suburb}...`)

    const html = await firecrawlScrape(pageUrl)
    if (!html) {
      console.log(`[firecrawl] No HTML returned for page ${page}, stopping.`)
      break
    }

    let listings = parseListingsFromNextData(html, suburb, stLower, postcode)

    if (listings.length === 0) {
      console.log(`[firecrawl] __NEXT_DATA__ parsing found 0 listings, trying HTML fallback...`)
      listings = parseListingsFromHtmlFallback(html, suburb, stLower, postcode)
    }

    console.log(`[firecrawl] Found ${listings.length} listings on page ${page}`)

    allListings.push(...listings)

    if (listings.length === 0) break

    if (page < maxPages) {
      await sleep(RATE_LIMIT_MS)
    }
  }

  console.log(`[firecrawl] Total on-market listings scraped for ${suburb}: ${allListings.length}`)
  return allListings
}

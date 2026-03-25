/**
 * Property Image Lookup
 *
 * Fetches property images from realestate.com.au for a given address.
 * First searches for the property via the suggest API, then fetches
 * the listing page to extract hero and gallery images.
 */

import { parseAddress } from './comparables-lookup'
// Firecrawl used via REST API (SDK has zod compat issues with Next.js 14)

const APIFY_TOKEN = process.env.APIFY_API_TOKEN
const ACTOR_ID = 'azzouzana~real-estate-au-scraper-pro'
const APIFY_BASE = 'https://api.apify.com/v2'

const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY

export interface PropertyImages {
  heroImage: string | null
  galleryImages: string[]
  source: string // e.g. "realestate.com.au"
}

const EMPTY_RESULT: PropertyImages = {
  heroImage: null,
  galleryImages: [],
  source: '',
}

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

// Map of abbreviated street types to their full forms used in realestate.com.au URLs
const STREET_TYPE_MAP: Record<string, string> = {
  st: 'street', rd: 'road', dr: 'drive', ave: 'avenue', ct: 'court',
  cres: 'crescent', cr: 'crescent', pl: 'place', blvd: 'boulevard',
  tce: 'terrace', pde: 'parade', hwy: 'highway', ln: 'lane',
  cl: 'close', cct: 'circuit', gr: 'grove', way: 'way',
  prom: 'promenade', esp: 'esplanade', rt: 'retreat', ri: 'rise',
  vw: 'view', gdn: 'garden', gdns: 'gardens', pk: 'park',
  sq: 'square', mews: 'mews', ch: 'chase', wk: 'walk',
  wy: 'way', gra: 'grange', trk: 'track', rw: 'row',
}

/**
 * Expand an abbreviated street type to its full form.
 * e.g. "Dr" → "Drive", "Ave" → "Avenue", "St" → "Street"
 */
function expandStreetType(abbrev: string): string {
  const lower = abbrev.toLowerCase()
  return STREET_TYPE_MAP[lower] || lower
}

// Shape returned by the realestate.com.au suggest API
interface ReaSuggestionSource {
  streetName?: string
  suburb?: string
  streetNumber?: string
  shortAddress?: string
  state?: string
  postcode?: string
  streetType?: string
  street?: string
  url?: string
}

interface ReaSuggestion {
  display: {
    text: string
    subText?: string
    subtext?: string
  }
  source?: ReaSuggestionSource | string
  id?: string
  slug?: string
  type?: string
}

/**
 * Search realestate.com.au suggestions for a property address.
 * Returns the slug (URL path segment) for the best matching property.
 */
async function searchRealEstate(address: string): Promise<string | null> {
  const encoded = encodeURIComponent(address)
  const url = `https://suggest.realestate.com.au/consumer-suggest/suggestions?max=5&type=address&src=homepage&query=${encoded}`

  console.log(`[property-images] Searching realestate.com.au: ${url}`)

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      console.error(`[property-images] Suggest API returned ${res.status}`)
      return null
    }

    const data = await res.json()
    const suggestions: ReaSuggestion[] = data?._embedded?.suggestions || data?.suggestions || []

    if (suggestions.length === 0) {
      console.log('[property-images] No suggestions found')
      return null
    }

    // Find the best match
    const best = suggestions[0]
    console.log(`[property-images] Best suggestion: ${best.display?.text}`)

    // Build slug from structured source data — use shortAddress AS-IS
    // realestate.com.au uses ABBREVIATED street types in slugs: /property/14-casey-dr-berwick-vic-3806
    // The suggest API's shortAddress already has the correct abbreviations ("14 Casey Dr")
    // DO NOT expand abbreviations — expanded forms (e.g. "drive") return wrong/empty pages
    const src = typeof best.source === 'object' ? best.source : null
    if (src?.shortAddress && src?.suburb && src?.state && src?.postcode) {
      const slug = `${src.shortAddress} ${src.suburb} ${src.state} ${src.postcode}`
        .toLowerCase()
        .replace(/[,]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
      console.log(`[property-images] Built slug from source: ${slug}`)
      return slug
    }

    // Fallback: build slug from display text as-is (already has correct abbreviations)
    const slugText = (best.display?.text || '')
      .toLowerCase()
      .replace(/[,]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    return slugText || null
  } catch (err) {
    console.error('[property-images] Suggest search failed:', err)
    return null
  }
}

/**
 * Build a realestate.com.au property slug from parsed address parts.
 * Keeps abbreviated street types as-is (realestate.com.au uses abbreviated forms in URLs).
 */
function buildSlugFromParts(address: string): string | null {
  const parts = parseAddress(address)
  if (!parts) return null

  const segments: string[] = []
  if (parts.streetNumber) segments.push(parts.streetNumber.toLowerCase())
  if (parts.streetName) {
    segments.push(...parts.streetName.split(/\s+/))
  }
  segments.push(...parts.suburb.split(/\s+/))
  segments.push(parts.state)
  segments.push(parts.postcode)

  return segments.join('-').replace(/[^a-z0-9-]/g, '')
}

/**
 * Extract images from a realestate.com.au property page HTML.
 */
function extractImagesFromHtml(html: string): { hero: string | null; gallery: string[] } {
  const images: string[] = []

  // 1. Try og:image meta tag (most reliable for hero)
  const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)
    || html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i)
  const heroFromOg = ogImageMatch?.[1] || null

  // 2. Try __NEXT_DATA__ for structured image data
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1])
      // Walk the props tree looking for image arrays
      const pageProps = data?.props?.pageProps
      extractImageUrls(pageProps, images)
    } catch {
      console.log('[property-images] Could not parse __NEXT_DATA__')
    }
  }

  // 3. Try JSON-LD structured data
  const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)
  for (const match of jsonLdMatches) {
    try {
      const ld = JSON.parse(match[1])
      if (ld.image) {
        const ldImages = Array.isArray(ld.image) ? ld.image : [ld.image]
        for (const img of ldImages) {
          const url = typeof img === 'string' ? img : img?.url
          if (url && isValidImageUrl(url)) images.push(url)
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  // 4. Scan for high-res property image URLs in the HTML
  const imgPattern = /https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)[^"'\s]*/gi
  const urlMatches = html.matchAll(imgPattern)
  for (const m of urlMatches) {
    const url = m[0]
    if (isPropertyImage(url) && !images.includes(url)) {
      images.push(url)
    }
  }

  // Deduplicate
  const uniqueImages = [...new Set(images)]

  // Use og:image as hero, or first gallery image
  const hero = heroFromOg || uniqueImages[0] || null
  const gallery = uniqueImages.filter((img) => img !== hero)

  return { hero, gallery }
}

/**
 * Recursively extract image URLs from a nested object (e.g. __NEXT_DATA__ props).
 */
function extractImageUrls(obj: unknown, results: string[], depth = 0): void {
  if (depth > 10 || !obj) return

  if (typeof obj === 'string' && isValidImageUrl(obj)) {
    results.push(obj)
    return
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      extractImageUrls(item, results, depth + 1)
    }
    return
  }

  if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      // Focus on image-related keys to avoid pulling in unrelated URLs
      const isImageKey =
        /image|photo|media|picture|thumbnail|hero|gallery/i.test(key) ||
        (typeof value === 'string' && isValidImageUrl(value))
      if (isImageKey) {
        extractImageUrls(value, results, depth + 1)
      }
    }
  }
}

function isValidImageUrl(url: string): boolean {
  return /^https?:\/\/.+\.(jpg|jpeg|png|webp)/i.test(url)
}

function isPropertyImage(url: string): boolean {
  // Filter to likely property listing images (not icons, logos, ads, placeholders)
  return (
    isValidImageUrl(url) &&
    !url.includes('logo') &&
    !url.includes('icon') &&
    !url.includes('avatar') &&
    !url.includes('badge') &&
    !url.includes('sprite') &&
    !url.includes('placeholder') &&
    !url.includes('open-graph') &&
    !url.includes('facebook-open-graph') &&
    !url.includes('domainstatic.com.au/domain/facebook') &&
    (url.includes('realestate.com.au') ||
      url.includes('domain.com.au') ||
      url.includes('bucket') ||
      url.includes('property') ||
      url.includes('listing') ||
      url.includes('photos') ||
      url.includes('rimages'))
  )
}

/**
 * Fetch property images from realestate.com.au.
 */
async function fetchFromRealEstate(address: string): Promise<PropertyImages> {
  // Step 1: Search for the property
  let slug = await searchRealEstate(address)

  // Fallback: build slug from parsed address
  if (!slug) {
    slug = buildSlugFromParts(address)
    if (!slug) return EMPTY_RESULT
    console.log(`[property-images] Using constructed slug: ${slug}`)
  }

  // Step 2: Fetch the property page
  const propertyUrl = `https://www.realestate.com.au/property/${slug}`
  console.log(`[property-images] Fetching property page: ${propertyUrl}`)

  try {
    const res = await fetch(propertyUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-AU,en;q=0.9',
        Referer: 'https://www.realestate.com.au/',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    })

    if (!res.ok) {
      console.error(`[property-images] Property page returned ${res.status}`)
      return EMPTY_RESULT
    }

    const html = await res.text()
    const { hero, gallery } = extractImagesFromHtml(html)

    if (!hero && gallery.length === 0) {
      console.log('[property-images] No images found on realestate.com.au property page')
      return EMPTY_RESULT
    }

    console.log(
      `[property-images] Found ${gallery.length + (hero ? 1 : 0)} images from realestate.com.au`
    )

    return {
      heroImage: hero,
      galleryImages: gallery,
      source: 'realestate.com.au',
    }
  } catch (err) {
    console.error('[property-images] Failed to fetch property page:', err)
    return EMPTY_RESULT
  }
}

/**
 * Fallback: Try domain.com.au search for property images.
 */
async function fetchFromDomain(address: string): Promise<PropertyImages> {
  const encoded = encodeURIComponent(address)
  const url = `https://www.domain.com.au/sale/?ssubs=1&page=1&sort=default-desc&search=${encoded}`

  console.log(`[property-images] Fallback: searching domain.com.au`)

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      },
    })

    if (!res.ok) {
      console.error(`[property-images] domain.com.au returned ${res.status}`)
      return EMPTY_RESULT
    }

    const html = await res.text()

    // Extract og:image as hero
    const ogMatch =
      html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
      html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i)

    const images: string[] = []

    // Look for listing image URLs in the HTML
    const imgPattern = /https?:\/\/[^"'\s]*rimages[^"'\s]*\.(?:jpg|jpeg|png|webp)[^"'\s]*/gi
    const urlMatches = html.matchAll(imgPattern)
    for (const m of urlMatches) {
      if (!images.includes(m[0])) images.push(m[0])
    }

    // Also try JSON-LD
    const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)
    for (const match of jsonLdMatches) {
      try {
        const ld = JSON.parse(match[1])
        if (ld.image) {
          const ldImages = Array.isArray(ld.image) ? ld.image : [ld.image]
          for (const img of ldImages) {
            const url = typeof img === 'string' ? img : img?.url
            if (url && isValidImageUrl(url) && !images.includes(url)) images.push(url)
          }
        }
      } catch {
        // ignore
      }
    }

    // Filter out generic placeholder images
    const ogImage = ogMatch?.[1] || null
    const isGenericOg = ogImage && (ogImage.includes('facebook-open-graph') || ogImage.includes('domainstatic.com.au/domain/facebook'))
    const hero = (!isGenericOg ? ogImage : null) || images[0] || null
    const gallery = images.filter((img) => img !== hero)

    if (!hero && gallery.length === 0) {
      console.log('[property-images] No images found on domain.com.au')
      return EMPTY_RESULT
    }

    console.log(
      `[property-images] Found ${gallery.length + (hero ? 1 : 0)} images from domain.com.au`
    )

    return {
      heroImage: hero,
      galleryImages: gallery,
      source: 'domain.com.au',
    }
  } catch (err) {
    console.error('[property-images] domain.com.au fallback failed:', err)
    return EMPTY_RESULT
  }
}

/**
 * Fetch property images via Apify realestate.com.au scraper.
 * Searches for the specific property address and extracts images from the result.
 */
async function fetchFromApify(address: string): Promise<PropertyImages> {
  if (!APIFY_TOKEN) {
    console.log('[property-images] No APIFY_API_TOKEN — skipping Apify')
    return EMPTY_RESULT
  }

  const parts = parseAddress(address)
  if (!parts) return EMPTY_RESULT

  // Build a realestate.com.au search URL for this specific address
  const suburbSlug = parts.suburb.toLowerCase().replace(/\s+/g, '-')
  const stateSlug = parts.state.toLowerCase()
  const streetSlug = [parts.streetNumber, parts.streetName].filter(Boolean).join(' ').toLowerCase().replace(/\s+/g, '-')

  // Search sold first (property may have sold recently), then buy
  const urls = [
    `https://www.realestate.com.au/sold/property-unit+apartment+villa+house-with-${streetSlug ? streetSlug + '-' : ''}in-${suburbSlug},+${stateSlug}+${parts.postcode}/list-1`,
    `https://www.realestate.com.au/buy/property-unit+apartment+villa+house-in-${suburbSlug},+${stateSlug}+${parts.postcode}/list-1`,
  ]

  for (const searchUrl of urls) {
    console.log(`[property-images] Apify search: ${searchUrl}`)

    try {
      const url = `${APIFY_BASE}/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url: searchUrl }],
          maxItems: 5,
        }),
        signal: AbortSignal.timeout(60_000),
      })

      if (!res.ok) continue

      const data = await res.json()
      if (!Array.isArray(data) || data.length === 0) continue

      // Find the result matching our street address
      const streetLower = (parts.streetNumber + ' ' + parts.streetName).toLowerCase().trim()
      const match = data.find((r: Record<string, unknown>) => {
        const addr = String(r.fullAddress || r.address || r.streetAddress || '').toLowerCase()
        return addr.includes(streetLower)
      }) || data[0] // Fall back to first result if no exact match

      // Extract images
      const heroImage = (match.mainImage || match.imageUrl || match.headerImage ||
        (Array.isArray(match.images) && match.images[0]) ||
        (Array.isArray(match.photos) && match.photos[0]) || null) as string | null

      const gallery: string[] = []
      if (Array.isArray(match.images)) {
        gallery.push(...match.images.filter((img: string) => img !== heroImage))
      } else if (Array.isArray(match.photos)) {
        gallery.push(...match.photos.filter((img: string) => img !== heroImage))
      }

      if (heroImage) {
        console.log(`[property-images] Apify found hero image + ${gallery.length} gallery images`)
        return {
          heroImage,
          galleryImages: gallery.slice(0, 10),
          source: 'realestate.com.au (via Apify)',
        }
      }
    } catch (err) {
      console.error('[property-images] Apify lookup failed:', err)
    }
  }

  return EMPTY_RESULT
}

/**
 * Fetch property images via Firecrawl (bypasses rate limits and bot detection).
 * Scrapes the realestate.com.au property page using Firecrawl's proxy + JS rendering.
 */
async function fetchFromFirecrawl(address: string): Promise<PropertyImages> {
  if (!FIRECRAWL_KEY) {
    console.log('[property-images] No FIRECRAWL_API_KEY — skipping Firecrawl')
    return EMPTY_RESULT
  }

  // Use suggest API to find the exact property slug (most reliable)
  let slug = await searchRealEstate(address)

  // Fallback: build slug from parsed address parts
  if (!slug) {
    slug = buildSlugFromParts(address)
    if (!slug) return EMPTY_RESULT
    console.log(`[property-images] Firecrawl using fallback slug: ${slug}`)
  }

  const propertyUrl = `https://www.realestate.com.au/property/${slug}`
  console.log(`[property-images] Firecrawl scraping: ${propertyUrl}`)

  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_KEY}`,
      },
      body: JSON.stringify({
        url: propertyUrl,
        formats: ['html'],
        waitFor: 2000,
        timeout: 30000,
      }),
      signal: AbortSignal.timeout(45000),
    })

    if (!res.ok) {
      console.error(`[property-images] Firecrawl API returned ${res.status}`)
      return EMPTY_RESULT
    }

    const result = await res.json()

    if (!result.success || !result.data?.html) {
      console.error(`[property-images] Firecrawl scrape failed: ${JSON.stringify(result.error || 'no HTML')}`)
      return EMPTY_RESULT
    }

    const html = result.data.html

    // Strategy 1: Find images with the property address in alt text
    // These are the ACTUAL property photos, not nearby/similar properties
    // Pattern: <img alt="14 Casey Drive, Berwick, Vic 3806" src="https://i2.au.reastatic.net/...">
    // or: src="..." ... alt="14 Casey ..."
    const addressForAlt = address.replace(/,/g, '').replace(/\s+/g, ' ').trim()
    const firstWord = addressForAlt.split(' ').slice(0, 3).join('[^"]*') // "14[^"]*Casey[^"]*Drive"
    const altPattern = new RegExp(
      `<img[^>]*(?:alt="[^"]*${firstWord}[^"]*"[^>]*src="([^"]+)"|src="([^"]+)"[^>]*alt="[^"]*${firstWord}[^"]*")`,
      'gi'
    )
    const altMatches = [...html.matchAll(altPattern)]
    const seenHashes = new Set<string>()
    const photos: string[] = []

    for (const m of altMatches) {
      const url = m[1] || m[2]
      if (!url || !url.includes('reastatic.net')) continue
      const hashMatch = url.match(/\/([a-f0-9]{40,})\//)
      const hash = hashMatch ? hashMatch[1] : url
      if (seenHashes.has(hash)) continue
      seenHashes.add(hash)
      const fullSize = url.replace(/\/\d+x\d+[^/]*\//, '/800x600/')
      photos.push(fullSize)
    }

    // Strategy 2: Also grab /main.jpg images (property photos, not listing thumbnails)
    if (photos.length === 0) {
      const mainPattern = /https:\/\/i\d\.au\.reastatic\.net\/\d+x\d+[^"<>\s]*\/main\.(?:jpg|jpeg|webp|png)/gi
      const mainMatches = [...html.matchAll(mainPattern)]
      for (const m of mainMatches) {
        const url = m[0]
        // Skip logos and branding (small dimensions like 340x64, 212x40)
        if (/\/(?:340x64|212x40|100x100|32x32)\//.test(url)) continue
        const hashMatch = url.match(/\/([a-f0-9]{40,})\//)
        const hash = hashMatch ? hashMatch[1] : url
        if (seenHashes.has(hash)) continue
        seenHashes.add(hash)
        const fullSize = url.replace(/\/\d+x\d+[^/]*\//, '/800x600/')
        photos.push(fullSize)
      }
    }

    // Strategy 3: Fallback to generic extraction
    if (photos.length === 0) {
      const { hero, gallery } = extractImagesFromHtml(html)
      if (!hero && gallery.length === 0) {
        console.log('[property-images] Firecrawl: no images found in scraped HTML')
        return EMPTY_RESULT
      }
      console.log(`[property-images] Firecrawl found ${gallery.length + (hero ? 1 : 0)} images (generic extraction)`)
      return { heroImage: hero, galleryImages: gallery, source: 'realestate.com.au (via Firecrawl)' }
    }

    const hero = photos[0]
    const gallery = photos.slice(1, 15)

    console.log(`[property-images] Firecrawl found ${photos.length} property photos (hero + ${gallery.length} gallery)`)
    return {
      heroImage: hero,
      galleryImages: gallery,
      source: 'realestate.com.au (via Firecrawl)',
    }
  } catch (err) {
    console.error('[property-images] Firecrawl failed:', err)
    return EMPTY_RESULT
  }
}

/**
 * Main entry point: look up property images for an Australian address.
 *
 * Priority: Firecrawl → Apify → direct realestate.com.au → domain.com.au → homely.com.au
 * Returns gracefully with empty result if all lookups fail.
 */
export async function lookupPropertyImages(propertyAddress: string): Promise<PropertyImages> {
  console.log(`[property-images] Looking up images for: ${propertyAddress}`)

  // Try Firecrawl first (bypasses rate limits via proxy + JS rendering)
  const firecrawlResult = await fetchFromFirecrawl(propertyAddress).catch((err) => {
    console.error('[property-images] Firecrawl lookup failed:', err)
    return EMPTY_RESULT
  })

  if (firecrawlResult.heroImage || firecrawlResult.galleryImages.length > 0) {
    return firecrawlResult
  }

  // Try Apify
  const apifyResult = await fetchFromApify(propertyAddress).catch((err) => {
    console.error('[property-images] Apify lookup failed:', err)
    return EMPTY_RESULT
  })

  if (apifyResult.heroImage || apifyResult.galleryImages.length > 0) {
    return apifyResult
  }

  // Try direct realestate.com.au scraping
  console.log('[property-images] No images from Apify, trying direct realestate.com.au')
  const reaResult = await fetchFromRealEstate(propertyAddress).catch((err) => {
    console.error('[property-images] realestate.com.au lookup failed:', err)
    return EMPTY_RESULT
  })

  if (reaResult.heroImage || reaResult.galleryImages.length > 0) {
    return reaResult
  }

  // Fallback to domain.com.au
  console.log('[property-images] No images from realestate.com.au, trying domain.com.au')
  const domainResult = await fetchFromDomain(propertyAddress).catch((err) => {
    console.error('[property-images] domain.com.au lookup failed:', err)
    return EMPTY_RESULT
  })

  if (domainResult.heroImage || domainResult.galleryImages.length > 0) {
    return domainResult
  }

  // Fallback 3: Try homely.com.au for any listing of this property
  console.log('[property-images] Trying homely.com.au as last resort')
  const homelyResult = await fetchFromHomely(propertyAddress).catch(() => EMPTY_RESULT)
  if (homelyResult.heroImage || homelyResult.galleryImages.length > 0) {
    return homelyResult
  }

  console.log('[property-images] No images found from any source')
  return EMPTY_RESULT
}

/**
 * Fallback: Try homely.com.au for property images.
 */
async function fetchFromHomely(address: string): Promise<PropertyImages> {
  const parts = parseAddress(address)
  if (!parts) return EMPTY_RESULT

  // Build the property slug for homely
  const segments: string[] = []
  if (parts.streetNumber) segments.push(parts.streetNumber)
  if (parts.streetName) segments.push(...parts.streetName.split(/\s+/))
  segments.push(...parts.suburb.split(/\s+/))
  segments.push(parts.state)
  segments.push(parts.postcode)

  const slug = segments.join('-').replace(/[^a-z0-9-]/gi, '').toLowerCase()
  const url = `https://www.homely.com.au/homes/${slug}`

  console.log(`[property-images] Trying homely: ${url}`)

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
    })

    if (!res.ok) return EMPTY_RESULT

    const html = await res.text()
    const { hero, gallery } = extractImagesFromHtml(html)

    if (hero) {
      console.log(`[property-images] Found images from homely.com.au`)
      return { heroImage: hero, galleryImages: gallery, source: 'homely.com.au' }
    }
  } catch {
    // ignore
  }

  return EMPTY_RESULT
}

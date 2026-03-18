/**
 * Property Image Lookup
 *
 * Fetches property images from realestate.com.au for a given address.
 * First searches for the property via the suggest API, then fetches
 * the listing page to extract hero and gallery images.
 */

import { parseAddress } from './comparables-lookup'

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

// Shape returned by the realestate.com.au suggest API
interface ReaSuggestion {
  display: {
    text: string
    subText?: string
  }
  source?: string
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

    // Find the best match — prefer one with a slug or id
    const best = suggestions[0]
    console.log(`[property-images] Best suggestion: ${best.display?.text}`)

    // The slug is typically in the id field or can be derived
    if (best.slug) return best.slug
    if (best.id) return best.id

    // Try to build a slug from the display text
    // realestate.com.au uses format: /property/42-smith-st-brighton-vic-3186
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
 */
function buildSlugFromParts(address: string): string | null {
  const parts = parseAddress(address)
  if (!parts) return null

  const segments: string[] = []
  if (parts.streetNumber) segments.push(parts.streetNumber.toLowerCase())
  if (parts.streetName) segments.push(...parts.streetName.split(/\s+/))
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
 * Main entry point: look up property images for an Australian address.
 *
 * Tries realestate.com.au first, then falls back to domain.com.au.
 * Returns gracefully with empty result if all lookups fail.
 */
export async function lookupPropertyImages(propertyAddress: string): Promise<PropertyImages> {
  console.log(`[property-images] Looking up images for: ${propertyAddress}`)

  // Try realestate.com.au first
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

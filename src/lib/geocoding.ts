/**
 * Geocoding & Distance Calculation Utility
 *
 * Uses the free Nominatim (OpenStreetMap) API to geocode Australian addresses
 * and calculates distances between properties using the Haversine formula.
 * No API key required. Rate limited to 1 request per second per Nominatim policy.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeocodedLocation {
  lat: number
  lng: number
}

// ---------------------------------------------------------------------------
// In-memory geocode cache (address string → coords)
// ---------------------------------------------------------------------------

const geocodeCache = new Map<string, GeocodedLocation | null>()

/**
 * Normalise an address string for consistent cache keys.
 * Lowercases, trims, collapses whitespace, strips trailing commas.
 */
function normaliseAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ---------------------------------------------------------------------------
// Australian street type & state abbreviation expansion (improves Nominatim)
// ---------------------------------------------------------------------------

const STREET_ABBREVS: Record<string, string> = {
  'st': 'Street', 'rd': 'Road', 'ave': 'Avenue', 'dr': 'Drive',
  'cres': 'Crescent', 'cr': 'Crescent', 'ct': 'Court', 'pl': 'Place',
  'ln': 'Lane', 'tce': 'Terrace', 'pde': 'Parade', 'cct': 'Circuit',
  'cl': 'Close', 'bvd': 'Boulevard', 'blvd': 'Boulevard', 'hwy': 'Highway',
  'way': 'Way', 'gr': 'Grove', 'gv': 'Grove', 'pk': 'Park',
  'rise': 'Rise', 'mews': 'Mews', 'esp': 'Esplanade',
}

const STATE_ABBREVS: Record<string, string> = {
  'vic': 'Victoria', 'nsw': 'New South Wales', 'qld': 'Queensland',
  'sa': 'South Australia', 'wa': 'Western Australia', 'tas': 'Tasmania',
  'nt': 'Northern Territory', 'act': 'Australian Capital Territory',
}

/**
 * Expand common Australian street type and state abbreviations
 * to improve Nominatim geocoding hit rate.
 * E.g. "12 Collins Cres, Berwick VIC 3806" → "12 Collins Crescent, Berwick Victoria 3806"
 */
function expandAbbreviations(address: string): string {
  let expanded = address

  // Expand street type abbreviations (word boundary match, case-insensitive)
  for (const [abbr, full] of Object.entries(STREET_ABBREVS)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi')
    expanded = expanded.replace(regex, full)
  }

  // Expand state abbreviations
  for (const [abbr, full] of Object.entries(STATE_ABBREVS)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi')
    expanded = expanded.replace(regex, full)
  }

  return expanded
}

// ---------------------------------------------------------------------------
// Rate limiting — max 1 request per second to Nominatim
// ---------------------------------------------------------------------------

let lastRequestTime = 0

async function rateLimit(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed))
  }
  lastRequestTime = Date.now()
}

// ---------------------------------------------------------------------------
// Geocoding
// ---------------------------------------------------------------------------

/**
 * Geocode a single address using the Nominatim OpenStreetMap API.
 * Returns { lat, lng } on success, or null if the address cannot be resolved.
 * Results are cached in memory to avoid duplicate requests.
 */
export async function geocodeAddress(
  address: string,
): Promise<GeocodedLocation | null> {
  const key = normaliseAddress(address)

  // Check cache first
  if (geocodeCache.has(key)) {
    return geocodeCache.get(key) ?? null
  }

  // Try with expanded abbreviations first (better Nominatim hit rate)
  const expanded = expandAbbreviations(address)
  const queries = [expanded]
  // If expansion changed the string, also try the original as fallback
  if (expanded !== address) queries.push(address)

  for (const query of queries) {
    await rateLimit()

    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', query)
    url.searchParams.set('format', 'json')
    url.searchParams.set('countrycodes', 'au')
    url.searchParams.set('limit', '1')

    try {
      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'GEA-Proposals/1.0',
          Accept: 'application/json',
        },
      })

      if (!res.ok) {
        console.error(
          `[geocoding] Nominatim returned ${res.status} for "${query}"`,
        )
        continue
      }

      const data = (await res.json()) as Array<{
        lat: string
        lon: string
        display_name?: string
      }>

      if (!data || data.length === 0) {
        console.warn(`[geocoding] No results for "${query}"`)
        continue
      }

      const result: GeocodedLocation = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      }

      geocodeCache.set(key, result)
      console.log(
        `[geocoding] ${address} → ${result.lat.toFixed(5)}, ${result.lng.toFixed(5)}`,
      )
      return result
    } catch (err) {
      console.error(`[geocoding] Failed to geocode "${query}":`, err)
    }
  }

  // All attempts failed — try suburb-only as last resort
  const suburbFallback = await geocodeSuburbFallback(address)
  geocodeCache.set(key, suburbFallback)
  return suburbFallback
}

/**
 * Fallback: geocode just the suburb to get approximate coordinates.
 * Extracts suburb from address and queries Nominatim for the suburb centre.
 */
async function geocodeSuburbFallback(
  address: string,
): Promise<GeocodedLocation | null> {
  // Try to extract "Suburb VIC 3806" or "Suburb, VIC 3806" from the address
  const match = address.match(
    /,?\s*([A-Za-z\s]+?)\s*,?\s*(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s+(\d{4})\s*$/i,
  )
  if (!match) return null

  const suburb = match[1].trim()
  const state = STATE_ABBREVS[match[2].toLowerCase()] || match[2]
  const query = `${suburb}, ${state}, Australia`

  await rateLimit()

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'json')
  url.searchParams.set('countrycodes', 'au')
  url.searchParams.set('limit', '1')

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'GEA-Proposals/1.0',
        Accept: 'application/json',
      },
    })

    if (!res.ok) return null
    const data = (await res.json()) as Array<{ lat: string; lon: string }>
    if (!data || data.length === 0) return null

    const result: GeocodedLocation = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    }

    console.log(
      `[geocoding] Suburb fallback for "${address}" → ${suburb} → ${result.lat.toFixed(5)}, ${result.lng.toFixed(5)}`,
    )
    return result
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Haversine distance
// ---------------------------------------------------------------------------

const EARTH_RADIUS_KM = 6371

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Calculate the distance in kilometres between two geographic points
 * using the Haversine formula.
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return Math.round(EARTH_RADIUS_KM * c * 100) / 100 // 2 decimal places
}

// ---------------------------------------------------------------------------
// Batch: add distances to a list of results
// ---------------------------------------------------------------------------

/**
 * Geocode the subject property once, then geocode each comparable result and
 * attach a `distance_km` field (distance from the subject in kilometres).
 *
 * If geocoding fails for the subject or a specific result, `distance_km` is
 * set to `null` for that entry. The original result properties are preserved.
 */
export async function addDistancesToResults<
  T extends { address: string; [key: string]: any },
>(
  subjectAddress: string,
  results: T[],
): Promise<Array<T & { distance_km: number | null }>> {
  const subjectLocation = await geocodeAddress(subjectAddress)

  const output: Array<T & { distance_km: number | null }> = []

  for (const result of results) {
    if (!subjectLocation) {
      output.push({ ...result, distance_km: null })
      continue
    }

    const resultLocation = await geocodeAddress(result.address)

    if (!resultLocation) {
      output.push({ ...result, distance_km: null })
      continue
    }

    const distance = calculateDistance(
      subjectLocation.lat,
      subjectLocation.lng,
      resultLocation.lat,
      resultLocation.lng,
    )

    output.push({ ...result, distance_km: distance })
  }

  return output
}

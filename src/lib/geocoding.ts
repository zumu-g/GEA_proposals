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

  await rateLimit()

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', address)
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
        `[geocoding] Nominatim returned ${res.status} for "${address}"`,
      )
      geocodeCache.set(key, null)
      return null
    }

    const data = (await res.json()) as Array<{ lat: string; lon: string }>

    if (!data || data.length === 0) {
      console.warn(`[geocoding] No results for "${address}"`)
      geocodeCache.set(key, null)
      return null
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
    console.error(`[geocoding] Failed to geocode "${address}":`, err)
    geocodeCache.set(key, null)
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

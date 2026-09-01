// ─────────────────────────────────────────────────────────────────────────────
// everypropertyAI data access
//
// Thin client over the everypropertyAI HTTP API (a separate, already-built service
// that wraps the property data pipeline). We make authenticated server-to-server
// requests and parse the JSON — we do NOT reimplement any pipeline logic here.
//
// Base URL comes from EVERYPROPERTY_API_URL (default the Railway prod URL below) and
// a required bearer token EVERYPROPERTY_API_TOKEN. Both are server-side only.
//
// Note: `/api/proposal` runs the full property pipeline — an uncached address can
// take up to ~120s (live crawl); cached addresses return quickly. Pass `fast: true`
// to request the faster (lower-fidelity) path.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_API_URL = 'https://geaeverypropertyai-production.up.railway.app'
const TIMEOUT_MS = 150_000 // generous — uncached proposal can take ~120s
const SUBURB_TIMEOUT_MS = 15_000 // suburb listing endpoints are DB reads — fail fast so the neighbour fan-out can't stall the wizard

// ─── Returned shape (ProposalPropertyData) — any field may be absent/empty ───
export interface ProposalPriceEstimate {
  low?: number
  mid?: number
  high?: number
  source?: string
}

export interface ProposalPropertyData {
  address: string
  addressSlug?: string
  bedrooms?: number
  bathrooms?: number
  carSpaces?: number
  landAreaSqm?: number
  propertyType?: string
  priceEstimate?: ProposalPriceEstimate | null
  formattedEstimate?: string
  agency?: string
  agentName?: string
  heroPhotos?: string[]
  suburb?: string
  description?: string
  confidence?: number
}

export interface AddressSuggestion {
  streetAddress?: string
  suburb?: string
  state?: string
  postcode?: string
  fullAddress?: string
  display?: string
  placeId?: string
}

// ─── HTTP transport ────────────────────────────────────────────────────────
function apiUrl(): string {
  return process.env.EVERYPROPERTY_API_URL || DEFAULT_API_URL
}

/** Authenticated GET against the everypropertyAI HTTP API; returns parsed JSON. */
async function getJson(
  path: string,
  params: Record<string, string>,
  timeoutMs: number = TIMEOUT_MS
): Promise<unknown> {
  const base = apiUrl()
  const token = process.env.EVERYPROPERTY_API_TOKEN || ''
  const url = new URL(path, base)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value)
  }

  let res: Response
  try {
    res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err: any) {
    if (err?.name === 'AbortError' || err?.name === 'TimeoutError') {
      throw new Error(
        `everypropertyAI timed out after ${timeoutMs / 1000}s (address may be uncached).`
      )
    }
    throw new Error(`everypropertyAI not reachable at ${base}`)
  }

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('everypropertyAI unauthorized (check EVERYPROPERTY_API_TOKEN)')
    }
    if (res.status === 400) {
      throw new Error('address is required')
    }
    throw new Error(`everypropertyAI request failed (HTTP ${res.status})`)
  }

  try {
    return await res.json()
  } catch {
    throw new Error('everypropertyAI returned invalid JSON')
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/** Presentation-ready property data for a confirmed address (GET /api/proposal). */
export async function getProposalData(
  address: string,
  opts?: { fast?: boolean }
): Promise<ProposalPropertyData> {
  const trimmed = address?.trim()
  if (!trimmed) throw new Error('address is required')
  const params: Record<string, string> = { address: trimmed }
  if (opts?.fast) params.fast = '1'
  const data = (await getJson('/api/proposal', params)) as ProposalPropertyData
  if (!data || typeof data !== 'object') {
    throw new Error('everypropertyAI proposal returned no data')
  }
  return data
}

// ─── Comparables (per-property coords from the everypropertyAI DB) ────────────
// The everypropertyAI database stores accurate per-property lat/long for Casey/
// Cardinia sold + on-market data, so distances computed against these are exact
// (no client-side suburb-centroid geocoding). Shape matches the wizard comp rows.

export interface EveryPropertyComp {
  address: string
  price: number
  askingPrice: string
  bedrooms: number
  bathrooms: number
  carSpaces: number
  cars: number
  propertyType: string
  date: string
  soldDate: string
  url: string
  link: string
  imageUrl: string | null
  lat: number | null
  lng: number | null
  landSize: string | null
  daysOnMarket: number | null
  sqft: number
  distance: number
}

interface SoldRow {
  rawAddress: string; salePrice: number | null; saleDate: string | null
  landAreaSqm: number | null; propertyType: string | null
  bedrooms: number | null; bathrooms: number | null; carSpaces: number | null
  latitude: number | null; longitude: number | null
  listingUrl: string | null; imageUrl: string | null
}
interface OnMarketRow {
  rawAddress: string; displayPrice: string | null; priceLow: number | null; priceHigh: number | null
  landAreaSqm: number | null; propertyType: string | null
  bedrooms: number | null; bathrooms: number | null; carSpaces: number | null
  latitude: number | null; longitude: number | null
  listingUrl: string | null; imageUrl: string | null
}
interface RentalRow {
  rawAddress: string; displayPrice: string | null; weeklyRent: number | null; status: string | null
  landAreaSqm: number | null; propertyType: string | null
  bedrooms: number | null; bathrooms: number | null; carSpaces: number | null
  latitude: number | null; longitude: number | null
  listingUrl: string | null; imageUrl: string | null; listedDate: string | null
}

function titleCaseSuburb(s: string): string {
  return s.trim().split(/\s+/).map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '')).join(' ')
}

/**
 * Comparables for a suburb from everypropertyAI, with accurate per-property
 * coordinates. `type`: 'sold' → /api/sold-sales; 'buy' (on-market) →
 * /api/on-market-listings; 'rent' | 'leased' → /api/rental-listings
 * ('leased' filters to rows the API marks status=Leased — the endpoint carries
 * only current listings today, so leased returns [] until the backend adds
 * historical data). Returns [] on any error — callers that need to tell an
 * outage apart from a genuinely-empty suburb use
 * getComparablesForAddressDetailed instead.
 */
export async function getComparables(
  suburb: string,
  type: 'sold' | 'buy' | 'rent' | 'leased',
  opts?: { state?: string; limit?: number }
): Promise<EveryPropertyComp[]> {
  try {
    return await getComparablesOrThrow(suburb, type, opts)
  } catch {
    return []
  }
}

/** Same mapping as getComparables but lets API errors propagate. */
async function getComparablesOrThrow(
  suburb: string,
  type: 'sold' | 'buy' | 'rent' | 'leased',
  opts?: { state?: string; limit?: number }
): Promise<EveryPropertyComp[]> {
  const sub = titleCaseSuburb(suburb)
  if (!sub) return []
  const state = (opts?.state || 'VIC').toUpperCase()
  const limit = String(opts?.limit ?? 200)
  const path =
    type === 'buy' ? '/api/on-market-listings'
    : type === 'rent' || type === 'leased' ? '/api/rental-listings'
    : '/api/sold-sales'

  const data = (await getJson(path, { suburb: sub, state, limit }, SUBURB_TIMEOUT_MS)) as {
    results?: unknown[]
  }
  const rows = Array.isArray(data?.results) ? data.results : []
  const landSizeStr = (n: number | null) => (n && n > 0 ? `${Math.round(n)}m²` : null)

  if (type === 'sold') {
    // Drop upstream data anomalies until everypropertyAI re-scrapes its
    // back-catalogue: a sold comp needs a usable price, and the dataset
    // currently carries garbage outliers (e.g. a bogus $140,000,000 row).
    return (rows as SoldRow[])
      .filter((r) => r.salePrice != null && r.salePrice > 0 && r.salePrice <= 50_000_000)
      .map((r) => ({
      address: r.rawAddress,
      price: r.salePrice ?? 0,
      askingPrice: r.salePrice ? `$${r.salePrice.toLocaleString()}` : 'Contact Agent',
      bedrooms: r.bedrooms ?? 0,
      bathrooms: r.bathrooms ?? 0,
      carSpaces: r.carSpaces ?? 0,
      cars: r.carSpaces ?? 0,
      propertyType: r.propertyType ?? 'House',
      date: r.saleDate ?? '',
      soldDate: r.saleDate ?? '',
      url: r.listingUrl ?? '',
      link: r.listingUrl ?? '',
      imageUrl: r.imageUrl ?? null,
      lat: r.latitude ?? null,
      lng: r.longitude ?? null,
      landSize: landSizeStr(r.landAreaSqm),
      daysOnMarket: null,
      sqft: 0,
      distance: 0,
    }))
  }

  if (type === 'rent' || type === 'leased') {
    let rentals = rows as RentalRow[]
    if (type === 'leased') {
      rentals = rentals.filter((r) => (r.status || '').toLowerCase() === 'leased')
    }
    return rentals.map((r) => ({
      address: r.rawAddress,
      price: r.weeklyRent ?? 0,
      askingPrice: r.displayPrice ?? (r.weeklyRent ? `$${r.weeklyRent} per week` : 'Contact Agent'),
      bedrooms: r.bedrooms ?? 0,
      bathrooms: r.bathrooms ?? 0,
      carSpaces: r.carSpaces ?? 0,
      cars: r.carSpaces ?? 0,
      propertyType: r.propertyType ?? 'House',
      date: r.listedDate ?? '',
      soldDate: r.listedDate ?? '',
      url: r.listingUrl ?? '',
      link: r.listingUrl ?? '',
      imageUrl: r.imageUrl ?? null,
      lat: r.latitude ?? null,
      lng: r.longitude ?? null,
      landSize: landSizeStr(r.landAreaSqm),
      daysOnMarket: null,
      sqft: 0,
      distance: 0,
    }))
  }

  // Lighter touch for on-market: only drop garbage price outliers. Price-less
  // listings ("Contact Agent") are legitimate and kept.
  return (rows as OnMarketRow[])
    .filter((r) => !(r.priceLow != null && r.priceLow > 50_000_000))
    .map((r) => ({
    address: r.rawAddress,
    price: r.priceLow ?? 0,
    askingPrice: r.displayPrice ?? (r.priceLow ? `$${r.priceLow.toLocaleString()}` : 'Contact Agent'),
    bedrooms: r.bedrooms ?? 0,
    bathrooms: r.bathrooms ?? 0,
    carSpaces: r.carSpaces ?? 0,
    cars: r.carSpaces ?? 0,
    propertyType: r.propertyType ?? 'House',
    date: '',
    soldDate: '',
    url: r.listingUrl ?? '',
    link: r.listingUrl ?? '',
    imageUrl: r.imageUrl ?? null,
    lat: r.latitude ?? null,
    lng: r.longitude ?? null,
    landSize: landSizeStr(r.landAreaSqm),
    daysOnMarket: null,
    sqft: 0,
    distance: 0,
  }))
}

/**
 * Comparables for a full address: subject suburb plus its neighbours (one
 * extra hop when the subject suburb is thin), deduped. Shared by
 * /api/comparables, /api/proposals, and email intake.
 */
export async function getComparablesForAddress(
  address: string,
  type: 'sold' | 'buy' | 'rent' | 'leased'
): Promise<EveryPropertyComp[]> {
  return (await getComparablesForAddressDetailed(address, type)).comps
}

/**
 * As getComparablesForAddress, but also reports how many per-suburb fetches
 * failed so callers can distinguish an API outage (all failed, comps empty)
 * from a genuinely-empty result.
 */
export async function getComparablesForAddressDetailed(
  address: string,
  type: 'sold' | 'buy' | 'rent' | 'leased'
): Promise<{ comps: EveryPropertyComp[]; failedSuburbs: number; totalSuburbs: number }> {
  const { parseAddress, NEIGHBORING_SUBURBS } = await import('./address-utils')
  const parts = parseAddress(address)
  const suburb = (parts?.suburb || address.replace(/[,]/g, ' ').replace(/\s+/g, ' ').trim()).toLowerCase()

  let failedSuburbs = 0
  const fetchSuburb = async (s: string): Promise<EveryPropertyComp[]> => {
    try {
      return await getComparablesOrThrow(s, type, { state: 'VIC', limit: 200 })
    } catch {
      failedSuburbs++
      return []
    }
  }

  const own = await fetchSuburb(suburb)
  const hop1 = (NEIGHBORING_SUBURBS[suburb] || []).filter((s) => s !== suburb)
  let reach = hop1
  if (own.length < 15) {
    // Sparse subject suburb (rural locality) — go one hop further out. The
    // wizard's client-side distance filter keeps relevance since every comp
    // carries real coordinates.
    const hop2 = hop1.flatMap((s) => NEIGHBORING_SUBURBS[s] || [])
    reach = [...new Set([...hop1, ...hop2])].filter((s) => s !== suburb)
  }
  const neighbours = (await Promise.all(reach.map(fetchSuburb))).flat()

  const seen = new Set<string>()
  const comps = [...own, ...neighbours].filter((c) => {
    const key = `${c.address.toLowerCase()}|${c.soldDate}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return { comps, failedSuburbs, totalSuburbs: 1 + reach.length }
}

/** Address suggestions for a partial query (GET /api/search). */
export async function suggestAddresses(query: string): Promise<AddressSuggestion[]> {
  const trimmed = query?.trim()
  if (!trimmed || trimmed.length < 3) return []
  const data = (await getJson('/api/search', { q: trimmed })) as { suggestions?: AddressSuggestion[] }
  return Array.isArray(data?.suggestions) ? data.suggestions : []
}

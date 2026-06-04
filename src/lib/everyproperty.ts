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
async function getJson(path: string, params: Record<string, string>): Promise<unknown> {
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
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (err: any) {
    if (err?.name === 'AbortError' || err?.name === 'TimeoutError') {
      throw new Error(
        `everypropertyAI timed out after ${TIMEOUT_MS / 1000}s (address may be uncached).`
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

function titleCaseSuburb(s: string): string {
  return s.trim().split(/\s+/).map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '')).join(' ')
}

/**
 * Comparables for a suburb from everypropertyAI, with accurate per-property
 * coordinates. `type`: 'sold' → /api/sold-sales; 'buy' (on-market) →
 * /api/on-market-listings. Returns [] on any error so callers can fall back.
 */
export async function getComparables(
  suburb: string,
  type: 'sold' | 'buy',
  opts?: { state?: string; limit?: number }
): Promise<EveryPropertyComp[]> {
  const sub = titleCaseSuburb(suburb)
  if (!sub) return []
  const state = (opts?.state || 'VIC').toUpperCase()
  const limit = String(opts?.limit ?? 200)
  const path = type === 'buy' ? '/api/on-market-listings' : '/api/sold-sales'

  let data: { results?: unknown[] }
  try {
    data = (await getJson(path, { suburb: sub, state, limit })) as { results?: unknown[] }
  } catch {
    return []
  }
  const rows = Array.isArray(data?.results) ? data.results : []
  const landSizeStr = (n: number | null) => (n && n > 0 ? `${Math.round(n)}m²` : null)

  if (type === 'sold') {
    return (rows as SoldRow[]).map((r) => ({
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

  return (rows as OnMarketRow[]).map((r) => ({
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

/** Address suggestions for a partial query (GET /api/search). */
export async function suggestAddresses(query: string): Promise<AddressSuggestion[]> {
  const trimmed = query?.trim()
  if (!trimmed || trimmed.length < 3) return []
  const data = (await getJson('/api/search', { q: trimmed })) as { suggestions?: AddressSuggestion[] }
  return Array.isArray(data?.suggestions) ? data.suggestions : []
}

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

/** Address suggestions for a partial query (GET /api/search). */
export async function suggestAddresses(query: string): Promise<AddressSuggestion[]> {
  const trimmed = query?.trim()
  if (!trimmed || trimmed.length < 3) return []
  const data = (await getJson('/api/search', { q: trimmed })) as { suggestions?: AddressSuggestion[] }
  return Array.isArray(data?.suggestions) ? data.suggestions : []
}

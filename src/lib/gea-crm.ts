// ─────────────────────────────────────────────────────────────────────────────
// GEA_CRM client — property/owner lookup, server-side only.
//
// On a confirmed proposal address the app looks the property up in GEA_CRM
// before everypropertyAI. The CRM is the system of record for OWNER identity
// (and a price guide when present); property facts (beds/baths/etc.) are usually
// null on the CRM side until everypropertyAI-enriched, so the proposals app
// still runs everypropertyAI for those — this client only supplies owner + price.
//
// The token is read server-side only and never returned to the browser; the
// browser reaches this via GET /api/gea-crm.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_API_URL = 'https://geacrmai-production.up.railway.app'
const TIMEOUT_MS = 8000

export interface CrmProperty {
  id: string
  address: string
  suburb: string | null
  state: string | null
  postcode: string | null
  propertyType: string | null
  bedrooms: number | null
  bathrooms: number | null
  carSpaces: number | null
  landSize: string | null
  ownerName: string | null
  ownerEmail: string | null
  ownerPhone: string | null
  priceGuide: string | null
  status: string | null
  crmUrl: string | null
}

export interface CrmSearchResult {
  found: boolean
  count: number
  properties: CrmProperty[]
  addPropertyUrl: string | null
  /** True when the lookup itself failed (timeout/401/network) — callers fall back
   *  to everypropertyAI silently rather than surfacing an error. */
  error?: string
}

function apiUrl(): string {
  return process.env.GEA_CRM_API_URL || DEFAULT_API_URL
}

/** Whether the CRM integration is configured (token present). */
export function isCrmConfigured(): boolean {
  return !!process.env.GEA_CRM_API_TOKEN
}

/**
 * Append a note to a CRM property (POST /api/properties/:id/notes, same
 * consumer key as search). Returns success=false rather than throwing.
 */
export async function addPropertyNote(
  propertyId: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  if (!isCrmConfigured()) return { success: false, error: 'GEA_CRM not configured' }
  try {
    const res = await fetch(new URL(`/api/properties/${encodeURIComponent(propertyId)}/notes`, apiUrl()).toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GEA_CRM_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return { success: false, error: `GEA_CRM note failed (HTTP ${res.status})` }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'GEA_CRM note failed' }
  }
}

/**
 * Log a "proposal sent" note against the CRM property matching this address.
 * Resolves the property via the existing search; a miss (property not in the
 * CRM, ambiguous match, or CRM down) is a silent no-op — sending the proposal
 * must never depend on the CRM.
 */
export async function logProposalSentNote(
  address: string,
  vendorName: string,
  proposalUrl: string
): Promise<{ success: boolean; error?: string }> {
  const result = await searchProperty(address)
  if (result.error) return { success: false, error: result.error }
  if (!result.found || result.properties.length === 0) {
    return { success: false, error: 'property not found in GEA_CRM' }
  }
  const property = result.properties[0]
  return addPropertyNote(
    property.id,
    `Proposal sent to ${vendorName}. View proposal: ${proposalUrl}`
  )
}

/**
 * Search GEA_CRM for a property by full address string. Always resolves — on any
 * failure it returns `{ found:false, count:0, ..., error }` so the caller can
 * degrade to everypropertyAI without try/catch.
 */
export async function searchProperty(address: string): Promise<CrmSearchResult> {
  const trimmed = address?.trim()
  const empty: CrmSearchResult = { found: false, count: 0, properties: [], addPropertyUrl: null }
  if (!trimmed) return { ...empty, error: 'address is required' }
  if (!isCrmConfigured()) return { ...empty, error: 'GEA_CRM not configured' }

  const url = new URL('/api/properties/search', apiUrl())
  url.searchParams.set('address', trimmed)

  let res: Response
  try {
    res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${process.env.GEA_CRM_API_TOKEN}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (err: any) {
    const reason =
      err?.name === 'AbortError' || err?.name === 'TimeoutError'
        ? `GEA_CRM timed out after ${TIMEOUT_MS / 1000}s`
        : `GEA_CRM not reachable`
    return { ...empty, error: reason }
  }

  if (!res.ok) {
    return { ...empty, error: `GEA_CRM request failed (HTTP ${res.status})` }
  }

  try {
    const data = (await res.json()) as Partial<CrmSearchResult>
    return {
      found: !!data.found,
      count: typeof data.count === 'number' ? data.count : (data.properties?.length ?? 0),
      properties: Array.isArray(data.properties) ? data.properties : [],
      addPropertyUrl: data.addPropertyUrl ?? null,
    }
  } catch {
    return { ...empty, error: 'GEA_CRM returned invalid JSON' }
  }
}

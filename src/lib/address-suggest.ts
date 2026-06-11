/**
 * Address Autocomplete
 *
 * Primary source: everypropertyAI's /api/search (Mapbox address index) —
 * authenticated server-to-server, so this must stay a server-side module.
 * Fallback: realestate.com.au suggest API, only when Mapbox returns no
 * VIC results for the query.
 *
 * Returns structured address data (suburb, state, postcode, street),
 * filtered to VIC and ranked with GEA service-area suburbs first.
 */

import { isServiceSuburb } from './service-suburbs'
import { suggestAddresses as epSuggestAddresses } from './everyproperty'

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

const SUGGEST_URL = 'https://suggest.realestate.com.au/consumer-suggest/suggestions'

export interface AddressSuggestion {
  display: string       // Full display text e.g. "17 Rose Garden Avenue, Officer VIC 3809"
  suburb: string        // "Officer"
  state: string         // "VIC"
  postcode: string      // "3809"
  streetAddress: string // "17 Rose Garden Avenue"
  fullAddress: string   // "17 Rose Garden Avenue, Officer VIC 3809"
  slug?: string         // realestate.com.au slug if available
}

/**
 * Fetch address suggestions — Mapbox (everypropertyAI) first, REA fallback.
 * Returns an empty array if the query is too short or on failure.
 */
export async function suggestAddresses(query: string): Promise<AddressSuggestion[]> {
  const trimmed = query?.trim()
  if (!trimmed || trimmed.length < 3) {
    return []
  }

  let results = await fetchMapboxSuggestions(trimmed)
  if (results.length === 0) {
    results = await fetchReaSuggestions(trimmed)
  }

  // Both indexes can return nothing when a suburb is appended without a
  // street type (e.g. "7 gilbert berwick") — retry without the last word
  if (results.length === 0 && trimmed.includes(' ')) {
    const shorter = trimmed.split(/\s+/).slice(0, -1).join(' ')
    if (shorter.length >= 3) {
      results = await fetchMapboxSuggestions(shorter)
      if (results.length === 0) results = await fetchReaSuggestions(shorter)
    }
  }

  return results
}

/** Rank VIC service-area suburbs first, cap at 8. */
function rankAndTrim(suggestions: AddressSuggestion[]): AddressSuggestion[] {
  return suggestions
    .filter((s) => s.state === 'VIC')
    .sort((a, b) => Number(isServiceSuburb(b.suburb)) - Number(isServiceSuburb(a.suburb)))
    .slice(0, 8)
}

// ─── Primary: everypropertyAI /api/search (Mapbox) ───────────────────────────

async function fetchMapboxSuggestions(query: string): Promise<AddressSuggestion[]> {
  try {
    const raw = await epSuggestAddresses(query)
    return rankAndTrim(
      raw
        .filter((s) => s.fullAddress || s.display)
        .map((s) => ({
          display: s.display || s.fullAddress || '',
          suburb: s.suburb || '',
          state: (s.state || '').toUpperCase(),
          postcode: s.postcode || '',
          streetAddress: s.streetAddress || '',
          fullAddress: s.fullAddress || s.display || '',
        }))
    )
  } catch (err) {
    console.error('[address-suggest] everypropertyAI search failed:', err)
    return []
  }
}

// ─── Fallback: realestate.com.au suggest API ─────────────────────────────────

interface ReaSuggestionSource {
  streetName?: string
  suburb?: string
  streetNumber?: string
  shortAddress?: string
  state?: string
  streetType?: string
  postcode?: string
  street?: string
  streetNumberFrom?: string
}

interface ReaSuggestionDisplay {
  text?: string      // e.g. "17 Rose Garden Ave, Officer, VIC 3809"
  subtext?: string   // e.g. "Property history" (lowercase t)
  subText?: string   // legacy format (camelCase)
}

interface ReaSuggestion {
  display?: ReaSuggestionDisplay
  source?: ReaSuggestionSource
  id?: string
  slug?: string
  type?: string
}

async function fetchReaSuggestions(query: string): Promise<AddressSuggestion[]> {
  // max=100: interstate matches crowd out VIC ones at lower limits — e.g.
  // "7 gilbert" only surfaces 7 Gilbert Pl Berwick when fetching ~100
  const url = `${SUGGEST_URL}?max=100&type=address&src=homepage&query=${encodeURIComponent(query)}`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      console.error(`[address-suggest] Suggest API returned ${res.status}`)
      return []
    }

    const data = await res.json()
    const suggestions: ReaSuggestion[] =
      data?._embedded?.suggestions || data?.suggestions || []

    return rankAndTrim(
      suggestions.filter((s) => s.display?.text).map((s) => parseSuggestion(s))
    )
  } catch (err) {
    console.error('[address-suggest] Failed to fetch suggestions:', err)
    return []
  }
}

/**
 * Parse a raw realestate.com.au suggestion into a clean AddressSuggestion.
 *
 * The API returns structured data in `source` (suburb, state, postcode, shortAddress)
 * and a display string in `display.text` (e.g. "17 Rose Garden Ave, Officer, VIC 3809").
 */
function parseSuggestion(s: ReaSuggestion): AddressSuggestion {
  const src = s.source
  const displayText = s.display?.text || ''

  // Prefer structured source data when available
  if (src) {
    const street = src.shortAddress || displayText
    const suburb = src.suburb || ''
    const state = src.state || ''
    const postcode = src.postcode || ''
    const fullAddress = [street, suburb, `${state} ${postcode}`.trim()]
      .filter(Boolean)
      .join(', ')

    return {
      display: fullAddress,
      suburb,
      state,
      postcode,
      streetAddress: street,
      fullAddress,
      slug: s.slug || s.id || undefined,
    }
  }

  // Fallback: parse from display.text (e.g. "17 Rose Garden Ave, Officer, VIC 3809")
  const fullAddress = displayText
  const commaIdx = displayText.indexOf(',')
  const street = commaIdx > -1 ? displayText.substring(0, commaIdx).trim() : displayText
  const rest = commaIdx > -1 ? displayText.substring(commaIdx + 1).trim() : ''

  // Try to parse "Officer, VIC 3809" or "Officer VIC 3809" from the rest
  const parts = rest.replace(/,/g, ' ').trim().split(/\s+/)
  const postcode = parts.length > 0 && /^\d{4}$/.test(parts[parts.length - 1])
    ? parts.pop()!
    : ''
  const state = parts.length > 0 && /^[A-Z]{2,3}$/.test(parts[parts.length - 1])
    ? parts.pop()!
    : ''
  const suburb = parts.join(' ')

  return {
    display: fullAddress,
    suburb,
    state,
    postcode,
    streetAddress: street,
    fullAddress,
    slug: s.slug || s.id || undefined,
  }
}

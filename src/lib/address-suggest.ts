/**
 * Address Autocomplete via realestate.com.au Suggest API
 *
 * Provides address suggestions as the user types, returning
 * structured address data (suburb, state, postcode, street).
 */

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

/**
 * Fetch address suggestions from realestate.com.au suggest API.
 * Returns an empty array if the query is too short or on failure.
 */
export async function suggestAddresses(query: string): Promise<AddressSuggestion[]> {
  const trimmed = query?.trim()
  if (!trimmed || trimmed.length < 3) {
    return []
  }

  const encoded = encodeURIComponent(trimmed)
  // Fetch more results so we still have enough after filtering to VIC only
  const url = `${SUGGEST_URL}?max=20&type=address&src=homepage&query=${encoded}`

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

    return suggestions
      .filter((s) => s.display?.text)
      .map((s) => parseSuggestion(s))
      .filter((s) => s.state === 'VIC')
      .slice(0, 8)
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

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

interface ReaSuggestionDisplay {
  text?: string    // e.g. "17 Rose Garden Avenue"
  subText?: string // e.g. "Officer VIC 3809"
}

interface ReaSuggestion {
  display?: ReaSuggestionDisplay
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
  const url = `${SUGGEST_URL}?max=8&type=address&src=homepage&query=${encoded}`

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
  } catch (err) {
    console.error('[address-suggest] Failed to fetch suggestions:', err)
    return []
  }
}

/**
 * Parse a raw realestate.com.au suggestion into a clean AddressSuggestion.
 */
function parseSuggestion(s: ReaSuggestion): AddressSuggestion {
  const street = s.display?.text || ''
  const subText = s.display?.subText || ''

  // subText is typically "Suburb STATE Postcode" e.g. "Officer VIC 3809"
  const parts = subText.trim().split(/\s+/)
  const postcode = parts.length > 0 && /^\d{4}$/.test(parts[parts.length - 1])
    ? parts.pop()!
    : ''
  const state = parts.length > 0 && /^[A-Z]{2,3}$/.test(parts[parts.length - 1])
    ? parts.pop()!
    : ''
  const suburb = parts.join(' ')

  const fullAddress = subText
    ? `${street}, ${subText}`
    : street

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

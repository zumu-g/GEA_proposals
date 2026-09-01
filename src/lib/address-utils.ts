// Address parsing + Casey/Cardinia suburb maps (extracted from comparables-lookup
// when the scraped property-data layer was removed — everypropertyAI is the data source).

export interface AddressParts {
  streetNumber?: string
  streetName?: string
  suburb: string
  state: string
  postcode: string
}

// Casey/Cardinia suburb → postcode lookup for addresses without state/postcode
const SUBURB_POSTCODES: Record<string, string> = {
  'berwick': '3806', 'narre warren': '3805', 'narre warren north': '3804',
  'narre warren south': '3805', 'pakenham': '3810', 'officer': '3809',
  'beaconsfield': '3807', 'beaconsfield upper': '3808',
  'cranbourne': '3977', 'cranbourne east': '3977', 'cranbourne west': '3977',
  'cranbourne north': '3977', 'cranbourne south': '3977',
  'clyde': '3978', 'clyde north': '3978',
  'hampton park': '3976', 'hallam': '3803', 'endeavour hills': '3802',
  'lynbrook': '3975', 'lyndhurst': '3975', 'doveton': '3177',
  'fountain gate': '3805', 'eumemmerring': '3177',
  'cardinia': '3978', 'nar nar goon': '3812', 'nar nar goon north': '3812',
  'maryknoll': '3812', 'tynong': '3813', 'tynong north': '3813',
  'garfield': '3814', 'garfield north': '3814', 'bunyip': '3815',
  'bunyip north': '3815', 'tonimbuk': '3815', 'lang lang': '3984',
  'koo wee rup': '3981', 'drouin': '3818', 'warragul': '3820',
  'pakenham upper': '3810', 'cockatoo': '3781', 'gembrook': '3783',
  'emerald': '3782', 'upper beaconsfield': '3808',
  'noble park': '3174', 'noble park north': '3174',
  'keysborough': '3173', 'dandenong': '3175', 'dandenong south': '3175',
}

/**
 * Neighboring suburbs within ~3-5km for the Casey/Cardinia corridor.
 * Used to widen comparable sales searches to adjacent suburbs.
 */
export const NEIGHBORING_SUBURBS: Record<string, string[]> = {
  'berwick': ['narre warren', 'narre warren south', 'beaconsfield', 'officer', 'hampton park', 'clyde north', 'fountain gate', 'hallam', 'endeavour hills'],
  'narre warren': ['berwick', 'narre warren north', 'narre warren south', 'fountain gate', 'hallam', 'hampton park', 'endeavour hills', 'doveton', 'eumemmerring'],
  'narre warren north': ['narre warren', 'berwick', 'endeavour hills', 'hallam', 'fountain gate', 'hampton park'],
  'narre warren south': ['narre warren', 'berwick', 'hampton park', 'cranbourne north', 'fountain gate', 'clyde north', 'lynbrook'],
  'pakenham': ['officer', 'beaconsfield', 'pakenham upper', 'nar nar goon', 'cardinia', 'clyde north'],
  'officer': ['pakenham', 'beaconsfield', 'berwick', 'clyde north', 'cardinia', 'beaconsfield upper'],
  'beaconsfield': ['berwick', 'officer', 'beaconsfield upper', 'clyde north', 'narre warren south', 'hampton park'],
  'beaconsfield upper': ['beaconsfield', 'officer', 'upper beaconsfield', 'pakenham upper', 'emerald', 'cockatoo'],
  'cranbourne': ['cranbourne east', 'cranbourne west', 'cranbourne north', 'cranbourne south', 'hampton park', 'lynbrook', 'lyndhurst', 'clyde'],
  'cranbourne east': ['cranbourne', 'cranbourne north', 'cranbourne south', 'clyde', 'clyde north'],
  'cranbourne west': ['cranbourne', 'cranbourne north', 'lynbrook', 'lyndhurst', 'hampton park'],
  'cranbourne north': ['cranbourne', 'cranbourne east', 'cranbourne west', 'narre warren south', 'hampton park', 'clyde north', 'lynbrook'],
  'cranbourne south': ['cranbourne', 'cranbourne east', 'clyde', 'lang lang', 'koo wee rup'],
  'clyde': ['clyde north', 'cranbourne east', 'cranbourne south', 'cardinia'],
  'clyde north': ['clyde', 'cranbourne east', 'cranbourne north', 'berwick', 'narre warren south', 'officer', 'beaconsfield', 'cardinia'],
  'hampton park': ['narre warren', 'narre warren south', 'cranbourne', 'cranbourne north', 'cranbourne west', 'lynbrook', 'hallam', 'berwick'],
  'hallam': ['narre warren', 'narre warren north', 'hampton park', 'endeavour hills', 'doveton', 'eumemmerring', 'lynbrook', 'fountain gate'],
  'endeavour hills': ['narre warren', 'narre warren north', 'hallam', 'doveton', 'eumemmerring'],
  'lynbrook': ['lyndhurst', 'cranbourne west', 'cranbourne north', 'hampton park', 'hallam', 'narre warren south'],
  'lyndhurst': ['lynbrook', 'cranbourne west', 'cranbourne', 'hampton park', 'keysborough', 'dandenong south'],
  'doveton': ['hallam', 'endeavour hills', 'eumemmerring', 'dandenong', 'noble park'],
  'fountain gate': ['narre warren', 'narre warren south', 'narre warren north', 'berwick', 'hallam'],
  'eumemmerring': ['doveton', 'hallam', 'dandenong', 'endeavour hills', 'noble park'],
  'cardinia': ['clyde', 'clyde north', 'officer', 'pakenham', 'nar nar goon'],
  'nar nar goon': ['pakenham', 'cardinia', 'tynong', 'officer', 'nar nar goon north', 'maryknoll'],
  'nar nar goon north': ['nar nar goon', 'maryknoll', 'tynong north', 'pakenham upper'],
  'maryknoll': ['nar nar goon', 'nar nar goon north', 'tynong north', 'pakenham upper'],
  'tynong': ['nar nar goon', 'garfield', 'pakenham', 'bunyip', 'tynong north'],
  'tynong north': ['tynong', 'garfield north', 'maryknoll', 'nar nar goon north', 'bunyip north'],
  'garfield': ['tynong', 'bunyip', 'nar nar goon', 'garfield north', 'bunyip north'],
  'garfield north': ['garfield', 'bunyip north', 'tynong north', 'tonimbuk'],
  'bunyip': ['garfield', 'tynong', 'drouin', 'lang lang', 'bunyip north', 'tonimbuk'],
  'bunyip north': ['bunyip', 'tonimbuk', 'garfield north', 'tynong north', 'garfield'],
  'tonimbuk': ['bunyip north', 'bunyip', 'garfield north', 'gembrook'],
  'lang lang': ['koo wee rup', 'cranbourne south', 'bunyip'],
  'koo wee rup': ['lang lang', 'cranbourne south'],
  'drouin': ['warragul', 'bunyip'],
  'warragul': ['drouin'],
  'pakenham upper': ['pakenham', 'beaconsfield upper', 'officer', 'cockatoo', 'gembrook'],
  'cockatoo': ['emerald', 'gembrook', 'beaconsfield upper', 'pakenham upper', 'upper beaconsfield'],
  'gembrook': ['cockatoo', 'emerald', 'pakenham upper', 'beaconsfield upper'],
  'emerald': ['cockatoo', 'gembrook', 'beaconsfield upper', 'upper beaconsfield'],
  'upper beaconsfield': ['beaconsfield upper', 'beaconsfield', 'officer', 'emerald', 'cockatoo'],
  'noble park': ['noble park north', 'dandenong', 'keysborough', 'doveton', 'eumemmerring'],
  'noble park north': ['noble park', 'dandenong', 'endeavour hills', 'doveton'],
  'keysborough': ['noble park', 'dandenong south', 'lyndhurst', 'dandenong'],
  'dandenong': ['dandenong south', 'noble park', 'noble park north', 'keysborough', 'doveton', 'eumemmerring'],
  'dandenong south': ['dandenong', 'keysborough', 'lyndhurst'],
}

/**
 * Parse an Australian address into parts.
 * E.g. "42 Smith St, Brighton VIC 3186" → { suburb: "brighton", state: "vic", postcode: "3186" }
 * Also handles addresses without state/postcode for known Casey/Cardinia suburbs.
 */
export function parseAddress(address: string): AddressParts | null {
  // Extract state + postcode from the end first
  const statePostMatch = address.match(
    /\s*,?\s*(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s+(\d{4})\s*$/i
  )
  if (statePostMatch) {
    const state = statePostMatch[1].toLowerCase()
    const postcode = statePostMatch[2]
    const beforeState = address.substring(0, statePostMatch.index).trim()

    // Split on comma to separate street from suburb
    // "52 Harkaway Rd, Berwick" → ["52 Harkaway Rd", "Berwick"]
    // "42 Smith St Brighton" → ["42 Smith St Brighton"] (no comma, use last word as suburb)
    const commaParts = beforeState.split(',').map(s => s.trim()).filter(Boolean)

    if (commaParts.length >= 2) {
      // Has comma: street part, suburb part
      const streetPart = commaParts.slice(0, -1).join(', ').trim()
      const suburb = commaParts[commaParts.length - 1].trim().toLowerCase()
      const streetNum = streetPart.match(/^(\d+[A-Za-z]?)/)
      const streetName = streetPart.replace(/^\d+[A-Za-z]?\s*/, '').trim().toLowerCase()

      return {
        streetNumber: streetNum?.[1],
        streetName: streetName || undefined,
        suburb,
        state,
        postcode,
      }
    }

    // No comma: try to separate street from suburb by known patterns
    // "42 Smith St Brighton" — suburb is the last word(s) after the street type
    const words = beforeState.split(/\s+/)
    if (words.length >= 3) {
      // Check if any word is a street type, suburb is everything after it
      const streetTypes = ['st', 'street', 'rd', 'road', 'ave', 'avenue', 'dr', 'drive',
        'cres', 'crescent', 'ct', 'court', 'pl', 'place', 'ln', 'lane', 'tce', 'terrace',
        'pde', 'parade', 'cct', 'circuit', 'cl', 'close', 'bvd', 'boulevard', 'blvd',
        'hwy', 'highway', 'way', 'gr', 'grove', 'gv', 'pk', 'park', 'rise', 'mews',
        'esp', 'esplanade']

      for (let i = words.length - 2; i >= 1; i--) {
        if (streetTypes.includes(words[i].toLowerCase())) {
          const streetPart = words.slice(0, i + 1).join(' ')
          const suburb = words.slice(i + 1).join(' ').toLowerCase()
          const streetNum = streetPart.match(/^(\d+[A-Za-z]?)/)
          const streetName = streetPart.replace(/^\d+[A-Za-z]?\s*/, '').trim().toLowerCase()

          return {
            streetNumber: streetNum?.[1],
            streetName: streetName || undefined,
            suburb,
            state,
            postcode,
          }
        }
      }
    }

    // Last resort: whole thing before state is the suburb (no street info)
    return {
      suburb: beforeState.trim().toLowerCase(),
      state,
      postcode,
    }
  }

  // Without state/postcode: "Brighton VIC 3186" already handled above
  // Try suburb-only match
  const suburbMatch = address.match(
    /([A-Za-z][A-Za-z\s]*?)\s+(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s+(\d{4})\s*$/i
  )
  if (suburbMatch) {
    return {
      suburb: suburbMatch[1].trim().toLowerCase(),
      state: suburbMatch[2].toLowerCase(),
      postcode: suburbMatch[3],
    }
  }

  // No state/postcode — try to detect suburb from known Casey/Cardinia list
  const cleaned = address.replace(/[,]/g, ' ').replace(/\s+/g, ' ').trim()
  const words = cleaned.split(' ')

  // Try the whole input as a suburb name first (e.g. just "Berwick" or "Narre Warren")
  const wholeAsSuburb = cleaned.toLowerCase()
  if (SUBURB_POSTCODES[wholeAsSuburb]) {
    return {
      suburb: wholeAsSuburb,
      state: 'vic',
      postcode: SUBURB_POSTCODES[wholeAsSuburb],
    }
  }

  // Try last 1, 2, or 3 words as suburb name: "17 Juliet Gardens, Pakenham" → "Pakenham"
  for (let n = 3; n >= 1; n--) {
    if (words.length < n + 1) continue
    const candidate = words.slice(-n).join(' ').toLowerCase()
    const postcode = SUBURB_POSTCODES[candidate]
    if (postcode) {
      const streetParts = words.slice(0, -n).join(' ')
      const streetNum = streetParts.match(/^(\d+[A-Za-z]?)/)
      const streetName = streetParts.replace(/^\d+[A-Za-z]?\s*/, '').trim().toLowerCase()
      return {
        streetNumber: streetNum?.[1],
        streetName: streetName || undefined,
        suburb: candidate,
        state: 'vic',
        postcode,
      }
    }
  }

  console.error(`[comparables] Could not parse address: ${address}`)
  return null
}

/**
 * GEA service-area suburbs (Casey/Cardinia + fringe).
 *
 * Lightweight, client-safe constant — keep in sync with the keys of
 * NEIGHBORING_SUBURBS in comparables-lookup.ts (which is server-only
 * because it pulls in the SQLite cache).
 *
 * Used to rank address-autocomplete suggestions so local addresses
 * surface ahead of other VIC matches.
 */
export const SERVICE_SUBURBS = new Set([
  'berwick',
  'narre warren',
  'narre warren north',
  'narre warren south',
  'pakenham',
  'officer',
  'beaconsfield',
  'beaconsfield upper',
  'cranbourne',
  'cranbourne east',
  'cranbourne west',
  'cranbourne north',
  'cranbourne south',
  'clyde',
  'clyde north',
  'hampton park',
  'hallam',
  'endeavour hills',
  'lynbrook',
  'lyndhurst',
  'doveton',
  'fountain gate',
  'eumemmerring',
  'cardinia',
  'nar nar goon',
  'tynong',
  'garfield',
  'bunyip',
  'lang lang',
  'koo wee rup',
  'drouin',
  'warragul',
  'pakenham upper',
  'cockatoo',
  'gembrook',
  'emerald',
  'upper beaconsfield',
  'noble park',
  'noble park north',
  'keysborough',
  'dandenong',
  'dandenong south',
])

/** True if the suburb (case-insensitive) is in the GEA service area. */
export function isServiceSuburb(suburb?: string | null): boolean {
  return !!suburb && SERVICE_SUBURBS.has(suburb.trim().toLowerCase())
}

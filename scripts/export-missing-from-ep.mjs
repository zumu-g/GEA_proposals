// Export legacy sold + on-market properties that are NOT already in everypropertyAI.
//
//   set -a; source .env; set +a; node scripts/export-missing-from-ep.mjs
//
// For each Casey/Cardinia suburb:
//  - Legacy: GET proposalto /api/comparables?address=<suburb>&source=local
//      (returns suburb + neighbours; sold rows have a date, on-market rows don't)
//  - everypropertyAI: GET <EP>/api/sold-sales and /api/on-market-listings
// We build the set of everypropertyAI addresses (per type), then emit the legacy
// rows whose normalised address is absent from everypropertyAI.
//
// Output:
//   exports/missing-from-ep-sold.json
//   exports/missing-from-ep-onmarket.json

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const PROD = process.env.EXPORT_BASE_URL || 'https://proposalto.com'
const EP = process.env.EVERYPROPERTY_API_URL || 'https://geaeverypropertyai-production.up.railway.app'
const TOKEN = process.env.EVERYPROPERTY_API_TOKEN || ''
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

if (!TOKEN) {
  console.error('Missing EVERYPROPERTY_API_TOKEN — run: set -a; source .env; set +a; node scripts/export-missing-from-ep.mjs')
  process.exit(1)
}

function loadSuburbs() {
  const src = readFileSync(join(ROOT, 'src/lib/comparables-lookup.ts'), 'utf8')
  const m = src.match(/NEIGHBORING_SUBURBS[^{]*{([\s\S]*?)\n}/)
  return [...m[1].matchAll(/^\s*'([^']+)'\s*:/gm)].map((x) => x[1])
}
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase())

// Normalise an address for cross-source matching: drop unit/punctuation noise,
// "vic", trailing 4-digit postcode; lowercase; collapse whitespace.
function normAddr(a) {
  return String(a || '')
    .toLowerCase()
    .replace(/\bvic\b/g, ' ')
    .replace(/\b\d{4}\b/g, ' ')
    .replace(/[.,/#!$%^&*;:{}=_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Known suburb names (longest-first) for robust matching against messy /
// duplicated legacy on-market addresses where comma-splitting fails.
let SUBURB_NAMES = []
function parseSuburbPostcode(address) {
  const s = String(address || '')
  const pc = (s.match(/\b(\d{4})\b\s*$/) || s.match(/\b(\d{4})\b/) || [])[1] || ''
  const low = s.toLowerCase()
  // Prefer the known suburb that appears latest in the string (closest to the
  // VIC/postcode tail), longest name wins ties.
  let suburb = '', bestPos = -1, bestLen = 0
  for (const name of SUBURB_NAMES) {
    const pos = low.lastIndexOf(name)
    if (pos === -1) continue
    if (pos > bestPos || (pos === bestPos && name.length > bestLen)) {
      bestPos = pos; bestLen = name.length; suburb = titleCase(name)
    }
  }
  if (!suburb) {
    const beforeVic = s.split(/\bVIC\b/i)[0] || ''
    const parts = beforeVic.split(',')
    if (parts.length >= 2) suburb = parts[parts.length - 1].trim()
  }
  return { suburb, postcode: pc }
}
const cleanLand = (v) => {
  if (v == null) return null
  const d = String(v).replace(/[^0-9]/g, '')
  const n = parseInt(d, 10)
  return d && Number.isFinite(n) && n > 0 ? n : null
}

async function getJson(url, headers) {
  const res = await fetch(url, headers ? { headers } : undefined)
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res.json()
}

const suburbs = loadSuburbs()
SUBURB_NAMES = [...suburbs].sort((a, b) => b.length - a.length) // longest-first
console.log(`Suburbs: ${suburbs.length}\nLegacy: ${PROD}\neverypropertyAI: ${EP}\n`)

// ── 1. Build everypropertyAI address sets (sold + on-market) ────────────────
const epSold = new Set()
const epBuy = new Set()
for (const sub of suburbs) {
  const Sub = titleCase(sub)
  try {
    const s = await getJson(`${EP}/api/sold-sales?suburb=${encodeURIComponent(Sub)}&state=VIC&limit=5000`, { Authorization: `Bearer ${TOKEN}` })
    for (const r of s.results || []) if (r.rawAddress) epSold.add(normAddr(r.rawAddress))
  } catch (e) { console.warn(`  EP sold ${sub}: ${e.message}`) }
  try {
    const b = await getJson(`${EP}/api/on-market-listings?suburb=${encodeURIComponent(Sub)}&state=VIC&limit=5000`, { Authorization: `Bearer ${TOKEN}` })
    for (const r of b.results || []) if (r.rawAddress) epBuy.add(normAddr(r.rawAddress))
  } catch (e) { console.warn(`  EP buy ${sub}: ${e.message}`) }
}
console.log(`everypropertyAI addresses — sold: ${epSold.size}, on-market: ${epBuy.size}\n`)

// ── 2. Pull legacy, split by type, keep those absent from everypropertyAI ────
const soldOut = new Map() // normAddr -> record
const buyOut = new Map()
for (const sub of suburbs) {
  try {
    const data = await getJson(`${PROD}/api/comparables?address=${encodeURIComponent(sub)}&type=sold&source=local`)
    const rows = data.sales || []
    let nsold = 0, nbuy = 0
    for (const s of rows) {
      const key = normAddr(s.address)
      if (!key) continue
      const hasDate = !!(s.soldDate || s.date)
      const { suburb, postcode } = parseSuburbPostcode(s.address)
      const base = {
        address: s.address || '', suburb, state: 'VIC', postcode,
        price: Number(s.price) || 0,
        bedrooms: Number(s.bedrooms) || 0, bathrooms: Number(s.bathrooms) || 0,
        car_spaces: Number(s.cars ?? s.carSpaces) || 0,
        property_type: s.propertyType || 'House',
        url: s.url || '', image_url: s.imageUrl || '',
        lat: s.lat ?? null, lng: s.lng ?? null,
        land_size: cleanLand(s.landSize), source: 'gea-legacy-db',
      }
      if (hasDate) {
        if (epSold.has(key) || soldOut.has(key)) continue
        if (!(base.price > 0)) continue // a sold record needs a price
        soldOut.set(key, { ...base, sold_date: String(s.soldDate || s.date).slice(0, 10) })
        nsold++
      } else {
        if (epBuy.has(key) || buyOut.has(key)) continue
        buyOut.set(key, { ...base, sold_date: '' })
        nbuy++
      }
    }
    console.log(`  ${sub.padEnd(22)} legacy ${rows.length} → +${nsold} sold, +${nbuy} on-market (missing)`)
  } catch (e) { console.warn(`  legacy ${sub}: ${e.message}`) }
}

// ── 3. Write outputs + summary ──────────────────────────────────────────────
mkdirSync(join(ROOT, 'exports'), { recursive: true })
const sold = [...soldOut.values()].sort((a, b) => (a.suburb || '').localeCompare(b.suburb) || b.sold_date.localeCompare(a.sold_date))
const buy = [...buyOut.values()].sort((a, b) => (a.suburb || '').localeCompare(b.suburb))
writeFileSync(join(ROOT, 'exports/missing-from-ep-sold.json'), JSON.stringify(sold, null, 2))
writeFileSync(join(ROOT, 'exports/missing-from-ep-onmarket.json'), JSON.stringify(buy, null, 2))

const stat = (arr) => {
  const ps = arr.map((r) => r.price).filter((p) => p > 0).sort((a, b) => a - b)
  return ps.length ? `min $${ps[0].toLocaleString()} / med $${ps[Math.floor(ps.length / 2)].toLocaleString()} / max $${ps[ps.length - 1].toLocaleString()}` : 'no priced rows'
}
console.log(`\nMISSING FROM everypropertyAI:`)
console.log(`  sold:      ${sold.length} rows → exports/missing-from-ep-sold.json  (${stat(sold)})`)
console.log(`  on-market: ${buy.length} rows → exports/missing-from-ep-onmarket.json  (${stat(buy)})`)

// One-off export: pull the agency's legacy sold sales from production and write
// a JSON backfill file for everypropertyAI. Re-runnable; safe to delete after.
//
//   node scripts/export-sold-backfill.mjs
//
// Source: GET /api/comparables?address=<suburb>&type=sold&source=local (public,
// returns the suburb + its neighbours). We pull all 42 Casey/Cardinia suburbs,
// dedupe by normalised address, transform into the /api/import-sold shape, and
// keep only sold rows with a real price in the last 24 months.

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const BASE = process.env.EXPORT_BASE_URL || 'https://proposalto.com'
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ── Suburb list: the 42 NEIGHBORING_SUBURBS keys ────────────────────────────
function loadSuburbs() {
  const src = readFileSync(join(ROOT, 'src/lib/comparables-lookup.ts'), 'utf8')
  const m = src.match(/NEIGHBORING_SUBURBS[^{]*{([\s\S]*?)\n}/)
  if (!m) throw new Error('Could not locate NEIGHBORING_SUBURBS')
  return [...m[1].matchAll(/^\s*'([^']+)'\s*:/gm)].map((x) => x[1])
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const normAddr = (a) => (a || '').toLowerCase().replace(/\s+/g, ' ').trim()

// "12 Smith St, Berwick VIC 3806" → { suburb: 'Berwick', postcode: '3806' }
function parseSuburbPostcode(address) {
  const s = String(address || '')
  const pc = (s.match(/\b(\d{4})\b\s*$/) || s.match(/\b(\d{4})\b/) || [])[1] || ''
  let suburb = ''
  const beforeVic = s.split(/\bVIC\b/i)[0] || ''
  const parts = beforeVic.split(',')
  if (parts.length >= 2) suburb = parts[parts.length - 1].trim()
  return { suburb, postcode: pc }
}

// "673m²m²" / "673 m²" / 673 → 673 ; junk → null
function cleanLandSize(v) {
  if (v == null) return null
  const digits = String(v).replace(/[^0-9]/g, '')
  if (!digits) return null
  const n = parseInt(digits, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

async function fetchSuburb(suburb) {
  // Bare suburb name is what the server's suburb parser expects ("berwick VIC"
  // without a postcode fails; the bare name resolves correctly).
  const url = `${BASE}/api/comparables?address=${encodeURIComponent(suburb)}&type=sold&source=local`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${suburb}: HTTP ${res.status}`)
  const data = await res.json()
  return Array.isArray(data?.sales) ? data.sales : []
}

// ── Main ──────────────────────────────────────────────────────────────────
const suburbs = loadSuburbs()
console.log(`Pulling ${suburbs.length} suburbs from ${BASE} ...`)

const byAddr = new Map()
for (const sub of suburbs) {
  try {
    const sales = await fetchSuburb(sub)
    let added = 0
    for (const s of sales) {
      const key = normAddr(s.address)
      if (!key || byAddr.has(key)) continue
      byAddr.set(key, s)
      added++
    }
    console.log(`  ${sub.padEnd(22)} ${sales.length} rows (+${added} new, ${byAddr.size} total)`)
  } catch (e) {
    console.warn(`  ${sub.padEnd(22)} FAILED: ${e.message}`)
  }
}

// 24-month cutoff
const cutoff = new Date()
cutoff.setDate(cutoff.getDate() - 730)

const out = []
for (const s of byAddr.values()) {
  const price = Number(s.price) || 0
  if (price <= 0) continue
  const dateStr = s.soldDate || s.date || ''
  const d = dateStr ? new Date(dateStr) : null
  if (!d || isNaN(d.getTime()) || d < cutoff) continue
  const { suburb, postcode } = parseSuburbPostcode(s.address)
  out.push({
    address: s.address || '',
    suburb,
    state: 'VIC',
    postcode,
    price,
    bedrooms: Number(s.bedrooms) || 0,
    bathrooms: Number(s.bathrooms) || 0,
    car_spaces: Number(s.cars ?? s.carSpaces) || 0,
    property_type: s.propertyType || 'House',
    sold_date: String(dateStr).slice(0, 10),
    url: s.url || '',
    image_url: s.imageUrl || '',
    lat: s.lat ?? null,
    lng: s.lng ?? null,
    land_size: cleanLandSize(s.landSize),
    source: 'gea-legacy-db',
  })
}

out.sort((a, b) => (a.suburb || '').localeCompare(b.suburb || '') || b.sold_date.localeCompare(a.sold_date))

mkdirSync(join(ROOT, 'exports'), { recursive: true })
const outPath = join(ROOT, 'exports/everyproperty-sold-backfill.json')
writeFileSync(outPath, JSON.stringify(out, null, 2))

// ── Summary ─────────────────────────────────────────────────────────────────
const prices = out.map((r) => r.price).sort((a, b) => a - b)
const median = prices.length ? prices[Math.floor(prices.length / 2)] : 0
const withBeds = out.filter((r) => r.bedrooms > 0).length
const under900 = out.filter((r) => r.price < 900000).length
const perSuburb = {}
for (const r of out) perSuburb[r.suburb] = (perSuburb[r.suburb] || 0) + 1

console.log(`\nWrote ${out.length} sold records → exports/everyproperty-sold-backfill.json`)
console.log(`price min/median/max: $${prices[0]?.toLocaleString()} / $${median.toLocaleString()} / $${prices[prices.length - 1]?.toLocaleString()}`)
console.log(`under $900k: ${under900} (${Math.round((under900 / out.length) * 100)}%) | with beds: ${withBeds} (${Math.round((withBeds / out.length) * 100)}%)`)
console.log(`suburbs with data: ${Object.keys(perSuburb).length}`)
const histo = {}
for (const p of prices) { const b = Math.floor(p / 100000) * 100; histo[b] = (histo[b] || 0) + 1 }
console.log('price bands (k):', Object.entries(histo).sort((a, b) => +a[0] - +b[0]).map(([k, v]) => `${k}:${v}`).join('  '))

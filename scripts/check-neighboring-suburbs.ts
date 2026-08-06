// Referential integrity for the suburb neighbour map — a neighbour that isn't
// itself a key silently produces an empty hop-2 widen for sparse localities.
// Run: npx tsx scripts/check-neighboring-suburbs.ts
import { NEIGHBORING_SUBURBS } from '../src/lib/comparables-lookup'
import assert from 'node:assert'

// Every neighbour must be a key (so hop-2 expansion works from it)
for (const [suburb, neighbors] of Object.entries(NEIGHBORING_SUBURBS)) {
  for (const n of neighbors) {
    assert(NEIGHBORING_SUBURBS[n], `${suburb} lists unknown neighbour "${n}"`)
    assert(n !== suburb, `${suburb} lists itself as a neighbour`)
  }
}

// The sparse rural localities that motivated the widen fix must be reachable
for (const s of ['bunyip north', 'tonimbuk', 'tynong north', 'garfield north', 'maryknoll']) {
  assert(NEIGHBORING_SUBURBS[s]?.length, `missing rural locality "${s}"`)
}

// Bunyip North's 2-hop reach must include the suburbs holding its $2M+ comps
const hop1 = NEIGHBORING_SUBURBS['bunyip north']
const reach = new Set([...hop1, ...hop1.flatMap((s) => NEIGHBORING_SUBURBS[s] || [])])
for (const s of ['tonimbuk', 'tynong north', 'garfield north', 'maryknoll', 'gembrook']) {
  assert(reach.has(s), `bunyip north 2-hop reach missing "${s}"`)
}

console.log('neighboring-suburbs map OK')

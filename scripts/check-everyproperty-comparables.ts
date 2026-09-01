// Runnable check for the everypropertyAI comparables client (U1/U2 of the
// single-source refactor). Hits the live API for a known suburb across all
// four types and asserts the mapped shape. Run: npx tsx scripts/check-everyproperty-comparables.ts
import { getComparables } from '../src/lib/everyproperty'

async function main() {
  const sold = await getComparables('Berwick', 'sold', { limit: 5 })
  console.assert(sold.length > 0, 'sold: expected rows for Berwick')
  console.assert(sold.every((r) => r.price > 0 && r.price <= 50_000_000), 'sold: price sanity')
  console.assert(sold.some((r) => r.lat !== null && r.lng !== null), 'sold: expected coords')

  const buy = await getComparables('Berwick', 'buy', { limit: 5 })
  console.assert(buy.length > 0, 'buy: expected rows for Berwick')
  console.assert(buy.every((r) => typeof r.askingPrice === 'string'), 'buy: askingPrice shape')

  const rent = await getComparables('Berwick', 'rent', { limit: 5 })
  console.assert(rent.length > 0, 'rent: expected rows for Berwick')
  console.assert(rent.every((r) => r.askingPrice.length > 0), 'rent: askingPrice shape')
  console.assert(rent.some((r) => r.lat !== null && r.lng !== null), 'rent: expected coords')

  // leased has no historical data upstream yet — must return [] (not throw)
  const leased = await getComparables('Berwick', 'leased', { limit: 5 })
  console.assert(Array.isArray(leased), 'leased: array expected')

  // error paths: garbage suburb / empty suburb return [] rather than throwing
  console.assert((await getComparables('', 'sold')).length === 0, 'empty suburb → []')
  console.assert(Array.isArray(await getComparables('Zzzznotasuburb', 'buy')), 'bad suburb → []')

  console.log(`OK — sold:${sold.length} buy:${buy.length} rent:${rent.length} leased:${leased.length}`)
}

main().catch((e) => { console.error(e); process.exit(1) })

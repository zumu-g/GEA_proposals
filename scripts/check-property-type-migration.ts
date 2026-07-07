// Verify the property_type migration against a COPY of the DB (never the live file).
// Run: npx tsx scripts/check-property-type-migration.ts /path/to/copy-of-gea.db
import assert from 'node:assert'
process.env.DATABASE_PATH = process.argv[2]
assert(process.env.DATABASE_PATH, 'usage: tsx scripts/check-property-type-migration.ts <db-copy-path>')

async function main() {
  const { getDb } = await import('../src/lib/db')
  getDb() // runs idempotent migrations
  const { getProposal, listProposals, saveProposal } = await import('../src/lib/proposal-generator')
  const all = await listProposals()
  assert(all.length > 0, 'expected existing proposals in the copied DB')
  // Some seed rows have ids that fail isValidProposalId — pick a retrievable one
  let legacy: Awaited<ReturnType<typeof getProposal>> = null
  for (const p of all) {
    legacy = await getProposal(p.id)
    if (legacy) break
  }
  assert(legacy, 'no retrievable proposal found in the copied DB')
  assert.equal(legacy.propertyType, 'house', `legacy proposal should read as house, got ${legacy.propertyType}`)
  const clone = { ...legacy, id: 'testpropertytypert', propertyType: 'commercial-property' as const }
  await saveProposal(clone)
  const back = await getProposal('testpropertytypert')
  assert.equal(back?.propertyType, 'commercial-property')
  console.log(`migration verify passed: ${all.length} proposals, legacy reads 'house', round-trip ok`)
}
main()

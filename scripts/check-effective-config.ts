// getEffectiveConfig must not let blank profile fields wipe agency defaults.
// Run: npx tsx scripts/check-effective-config.ts
import assert from 'node:assert/strict'

// Mirrors the merge in src/lib/user-profile.ts — kept in step with it by hand;
// the real function needs a DB, which this check deliberately avoids.
const or = (v: string | null | undefined, fallback: string | undefined) => (v && v.trim() ? v : fallback)

const AGENCY_BIO = 'As Principal of Grants Berwick and Pakenham offices...'

// The production bug: bio field saved blank from settings
assert.equal(or('', AGENCY_BIO), AGENCY_BIO, 'empty string must fall back')
assert.equal(or('   ', AGENCY_BIO), AGENCY_BIO, 'whitespace-only must fall back')
assert.equal(or(null, AGENCY_BIO), AGENCY_BIO, 'null must fall back')
assert.equal(or(undefined, AGENCY_BIO), AGENCY_BIO, 'undefined must fall back')

// A real profile value still wins
assert.equal(or('My own bio', AGENCY_BIO), 'My own bio')
assert.equal(or('Director - Berwick and Pakenham', 'Principal'), 'Director - Berwick and Pakenham')

console.log('check-effective-config: all assertions passed')

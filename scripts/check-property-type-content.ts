// Self-check for the property-type content library.
// Run: npx tsx scripts/check-property-type-content.ts
import assert from 'node:assert'
import {
  PROPERTY_TYPES,
  PROPERTY_TYPE_CONTENT,
  getPropertyTypeContent,
  resolveSaleProcess,
} from '../src/lib/property-type-content'

// Structural completeness: every type has a full entry
for (const type of PROPERTY_TYPES) {
  const c = PROPERTY_TYPE_CONTENT[type]
  assert(c, `missing entry for ${type}`)
  assert.equal(c.type, type)
  assert(c.label.length > 0, `${type}: empty label`)
  assert(c.saleMethods.length >= 4, `${type}: sale methods missing`)
  assert(Array.isArray(c.saleProcessSteps.default) && c.saleProcessSteps.default.length === 6,
    `${type}: default sale process must have 6 steps`)
  for (const [method, steps] of Object.entries(c.saleProcessSteps)) {
    steps.forEach((s, i) => {
      assert.equal(s.step, i + 1, `${type}/${method}: step numbering broken`)
      assert(s.title && s.description, `${type}/${method}: empty step copy`)
    })
  }
  // Copy overrides, where present, must be non-empty strings
  for (const [k, v] of Object.entries(c.copy)) {
    assert(typeof v === 'string' && v.trim().length > 20, `${type}: copy.${k} is empty or too short`)
  }
  assert(c.comparablesFilter === null || c.comparablesFilter.length > 0, `${type}: empty filter array`)
}

// House baseline: no copy overrides, current behaviour flags
assert.equal(Object.keys(PROPERTY_TYPE_CONTENT.house.copy).length, 0, 'house must carry no copy overrides')
assert.equal(PROPERTY_TYPE_CONTENT.house.requiresComparables, true)
assert.equal(PROPERTY_TYPE_CONTENT.house.showsVipBuyers, true)

// No-local-data types never require comparables
for (const t of ['land', 'residential-development', 'commercial-property', 'commercial-land'] as const) {
  assert.equal(PROPERTY_TYPE_CONTENT[t].requiresComparables, false, `${t} must not require comps`)
  assert.equal(PROPERTY_TYPE_CONTENT[t].showsVipBuyers, false, `${t} must omit VIP buyers`)
  assert.equal(PROPERTY_TYPE_CONTENT[t].includesOpenHomes, false, `${t} must omit open homes`)
}

// Fallback behaviour
assert.equal(getPropertyTypeContent(undefined).type, 'house')
assert.equal(getPropertyTypeContent(null).type, 'house')
assert.equal(getPropertyTypeContent('mansion').type, 'house')

// Method resolution: case-insensitive with default fallback
assert.equal(resolveSaleProcess('house', 'Auction'), PROPERTY_TYPE_CONTENT.house.saleProcessSteps.auction)
assert.equal(resolveSaleProcess('house', 'AUCTION'), PROPERTY_TYPE_CONTENT.house.saleProcessSteps.auction)
assert.equal(resolveSaleProcess('house', ''), PROPERTY_TYPE_CONTENT.house.saleProcessSteps.default)
assert.equal(resolveSaleProcess('house', 'Tender'), PROPERTY_TYPE_CONTENT.house.saleProcessSteps.default)
assert.equal(resolveSaleProcess('commercial-property', 'Expressions of Interest'),
  PROPERTY_TYPE_CONTENT['commercial-property'].saleProcessSteps['expressions of interest'])
assert.equal(resolveSaleProcess('commercial-property', 'Auction'),
  PROPERTY_TYPE_CONTENT['commercial-property'].saleProcessSteps.default)
assert.equal(resolveSaleProcess('unknown-type', 'Auction'), PROPERTY_TYPE_CONTENT.house.saleProcessSteps.auction)

console.log('property-type-content: all checks passed')

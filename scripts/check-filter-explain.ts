// Invariants for filterWithExplain — run: npx tsx scripts/check-filter-explain.ts
import assert from 'node:assert/strict'
import { filterWithExplain, type FilterCriterion } from '../src/lib/filter-explain'

type Row = { type: string; price: number }
const rows: Row[] = [
  { type: 'land', price: 1_691_488 },
  { type: 'land', price: 2_900_000 },
  { type: 'house', price: 1_800_000 },
  { type: 'house', price: 2_100_000 },
  { type: 'unit', price: 500_000 },
]
const crit = (label: string, active: boolean, test: (r: Row) => boolean): FilterCriterion<Row> => ({ label, active, test })
const isLand = crit('property type: Land', true, r => r.type === 'land')
const inBand = crit('price range', true, r => r.price >= 1_700_000 && r.price <= 2_700_000)

// Inactive criteria are ignored
assert.equal(filterWithExplain(rows, [crit('x', false, () => false)]).rows.length, 5)

// Normal match, nothing to explain
{
  const res = filterWithExplain(rows, [inBand])
  assert.equal(res.rows.length, 2)
  assert.equal(res.candidates, undefined)
}

// The real bug: land + $1.7-2.7m is empty, and the type filter is to blame
{
  const res = filterWithExplain(rows, [isLand, inBand])
  assert.equal(res.rows.length, 0)
  assert.deepEqual(res.candidates, [
    { label: 'property type: Land', wouldReturn: 2 },
    { label: 'price range', wouldReturn: 2 },
  ])
}

// A criterion that excludes everything on its own can't be rescued by dropping
// any single other one
{
  const res = filterWithExplain(rows, [isLand, crit('beds', true, () => false), inBand])
  assert.equal(res.candidates, undefined)
}

// Ordered most-freeing first, and every listed candidate really does rescue
{
  const cheap = crit('price under 600k', true, r => r.price < 600_000)
  const res = filterWithExplain(rows, [isLand, cheap])
  assert.deepEqual(res.candidates, [
    { label: 'price under 600k', wouldReturn: 2 },
    { label: 'property type: Land', wouldReturn: 1 },
  ])
}

// A single active criterion never names itself — nothing useful to say
{
  const res = filterWithExplain(rows, [crit('nope', true, () => false)])
  assert.equal(res.rows.length, 0)
  assert.equal(res.candidates, undefined)
}

// Empty input is not a filter problem
assert.equal(filterWithExplain([], [isLand, inBand]).candidates, undefined)

console.log('check-filter-explain: all assertions passed')

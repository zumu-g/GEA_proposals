// Parsing + prompt-context invariants for AI agent copy.
// Run: npx tsx scripts/check-agent-copy.ts   (no API calls, no key needed)
import assert from 'node:assert/strict'
import { __test } from '../src/lib/agent-copy'

const { parseCopy, contextBlock } = __test

// Plain JSON
{
  const r = parseCopy('{"bio":"Stuart leads the team.","intro":"We have prepared this."}')
  assert.equal(r.bio, 'Stuart leads the team.')
  assert.equal(r.intro, 'We have prepared this.')
}

// Fenced JSON — the model sometimes wraps despite instructions
{
  const r = parseCopy('```json\n{"bio":"A","intro":"B"}\n```')
  assert.deepEqual(r, { bio: 'A', intro: 'B' })
}
assert.deepEqual(parseCopy('```\n{"bio":"A","intro":"B"}\n```'), { bio: 'A', intro: 'B' })

// Whitespace is trimmed off both fields
assert.deepEqual(parseCopy('{"bio":"  A  ","intro":"\\n B \\n"}'), { bio: 'A', intro: 'B' })

// Malformed or incomplete responses must throw, never yield a half-filled draft
assert.throws(() => parseCopy('not json'))
assert.throws(() => parseCopy('{"bio":"only bio"}'), /missing bio or intro/)
assert.throws(() => parseCopy('{"bio":123,"intro":"B"}'), /missing bio or intro/)

// Context never invents an owner name when none was supplied
{
  const block = contextBlock({
    agentName: 'Stuart Grant',
    agencyName: "Grant's Estate Agents",
    propertyAddress: '2-4 Innes Court, Berwick VIC 3806',
  })
  assert.match(block, /do not invent one/)
  assert.match(block, /selling the property/)
}
{
  const block = contextBlock({
    agentName: 'Stuart Grant',
    agencyName: "Grant's",
    propertyAddress: '1 Test St',
    clientName: 'Jane Smith',
    proposalType: 'rental',
    priceGuideMin: '1700000',
    priceGuideMax: '2700000',
  })
  assert.match(block, /Owner: Jane Smith/)
  assert.match(block, /leasing the property/)
  assert.match(block, /\$1,700,000 - \$2,700,000/)
}

console.log('check-agent-copy: all assertions passed')

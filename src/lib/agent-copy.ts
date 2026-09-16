// ─────────────────────────────────────────────────────────────────────────────
// AI-generated agent copy for a proposal: the "your agent" bio and the
// vendor-specific introduction. Both are drafts the agent edits before the
// proposal is created — nothing here is sent to a vendor unreviewed.
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk'

let _anthropic: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY environment variable is not set. ' +
        'Set it in .env.local (and on Railway) to enable AI copy generation.'
    )
  }
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

export interface AgentCopyContext {
  agentName: string
  agentTitle?: string
  agentYearsExperience?: number
  /** The agent's standing bio — the model rewrites this, it doesn't invent a career. */
  baseBio?: string
  agencyName: string
  clientName?: string
  propertyAddress: string
  propertyType?: string
  methodOfSale?: string
  priceGuideMin?: string
  priceGuideMax?: string
  proposalType?: 'sale' | 'rental'
}

export interface AgentCopy {
  bio: string
  intro: string
}

const SYSTEM = `You write copy for Australian real estate proposals sent to individual property owners.

Rules:
- Australian English throughout.
- Warm and direct. No hype, no superlatives, no "nestled", "boasts", "unparalleled", "in today's market".
- Never invent facts: no sale counts, awards, suburb records, years of experience, or client quotes beyond what you are given.
- Address the owner by first name when one is supplied. Never invent a name.
- Plain sentences. No em-dash-heavy rhythm, no rhetorical questions, no closing call to action.

Return ONLY a JSON object, no markdown fence, with exactly these keys:
{"bio": "...", "intro": "..."}

bio: 2-3 sentences in the third person about the agent, adapted from the supplied bio to suit this particular property and owner. Keep every concrete fact from the supplied bio; drop anything irrelevant to this listing.
intro: 2-3 sentences in the first person plural ("we"), addressed to this owner, introducing the proposal for their specific property. Mention the property and what the proposal covers. Do not repeat the bio.`

function contextBlock(c: AgentCopyContext): string {
  const lines = [
    `Agent: ${c.agentName}${c.agentTitle ? `, ${c.agentTitle}` : ''}`,
    `Agency: ${c.agencyName}`,
    c.agentYearsExperience ? `Years of experience: ${c.agentYearsExperience}` : null,
    c.baseBio ? `Existing bio to adapt:\n${c.baseBio}` : null,
    c.clientName ? `Owner: ${c.clientName}` : 'Owner: name not supplied — do not invent one',
    `Property: ${c.propertyAddress}`,
    c.propertyType ? `Property type: ${c.propertyType}` : null,
    `Proposal is for: ${c.proposalType === 'rental' ? 'leasing the property' : 'selling the property'}`,
    c.methodOfSale ? `Method of sale: ${c.methodOfSale}` : null,
    c.priceGuideMin && c.priceGuideMax
      ? `Price guide: $${Number(c.priceGuideMin).toLocaleString('en-AU')} - $${Number(c.priceGuideMax).toLocaleString('en-AU')}`
      : null,
  ]
  return lines.filter(Boolean).join('\n')
}

/** Strip a ```json fence if the model adds one despite instructions. */
function parseCopy(text: string): AgentCopy {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  const parsed = JSON.parse(cleaned)
  if (typeof parsed.bio !== 'string' || typeof parsed.intro !== 'string') {
    throw new Error('Model response missing bio or intro')
  }
  return { bio: parsed.bio.trim(), intro: parsed.intro.trim() }
}

export async function generateAgentCopy(context: AgentCopyContext): Promise<AgentCopy> {
  const response = await getAnthropicClient().messages.create({
    model: 'claude-opus-5',
    max_tokens: 2000,
    system: SYSTEM,
    messages: [{ role: 'user', content: contextBlock(context) }],
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  return parseCopy(text)
}

// Exported for the check script — the parsing is the part worth testing.
export const __test = { parseCopy, contextBlock }

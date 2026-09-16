// ─────────────────────────────────────────────────────────────────────────────
// AI-generated agent copy for a proposal: the "your agent" bio and the
// vendor-specific introduction. Both are drafts the agent edits before the
// proposal is created — nothing here is sent to a vendor unreviewed.
//
// Provider is MiniMax via its OpenAI-compatible /chat/completions endpoint,
// matching the other GEA projects:
//   MINIMAX_API_KEY   — required; no key means the route returns 503
//   MINIMAX_BASE_URL  — default https://api.minimax.io/v1
//   MINIMAX_MODEL     — default MiniMax-M2
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = 'https://api.minimax.io/v1'
const DEFAULT_MODEL = 'MiniMax-M2'
const TIMEOUT_MS = 30_000

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

/**
 * Recover the JSON object from a model response. MiniMax-M2 is a reasoning
 * model: it emits inline <think>…</think> traces, and sometimes wraps the
 * answer in a markdown fence despite instructions. Strip both, then fall back
 * to the outermost {...} span if anything still surrounds it.
 */
function parseCopy(text: string): AgentCopy {
  let cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/?think>/gi, '')
    .trim()
    .replace(/^```(?:json)?\s*/, '')
    .replace(/\s*```$/, '')
    .trim()

  if (!cleaned.startsWith('{')) {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start === -1 || end <= start) throw new Error('No JSON object in model response')
    cleaned = cleaned.slice(start, end + 1)
  }

  const parsed = JSON.parse(cleaned)
  if (typeof parsed.bio !== 'string' || typeof parsed.intro !== 'string') {
    throw new Error('Model response missing bio or intro')
  }
  return { bio: parsed.bio.trim(), intro: parsed.intro.trim() }
}

export async function generateAgentCopy(context: AgentCopyContext): Promise<AgentCopy> {
  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) {
    throw new Error(
      'MINIMAX_API_KEY environment variable is not set. ' +
        'Set it in .env (and on Railway) to enable AI copy generation.'
    )
  }

  const baseUrl = process.env.MINIMAX_BASE_URL || DEFAULT_BASE_URL
  const model = process.env.MINIMAX_MODEL || DEFAULT_MODEL

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: contextBlock(context) },
      ],
      temperature: 0.7,
      // Reasoning tokens are spent before the answer — leave room for both.
      max_tokens: 4000,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const detail =
      body?.error?.message || body?.base_resp?.status_msg || response.statusText
    throw new Error(`MiniMax error (${response.status}): ${detail}`)
  }

  const data = await response.json()
  // MiniMax reports business errors in base_resp with HTTP 200.
  if (data?.base_resp?.status_code && data.base_resp.status_code !== 0) {
    throw new Error(`MiniMax error: ${data.base_resp.status_msg || 'unknown'}`)
  }

  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('MiniMax returned an empty response')
  }

  return parseCopy(content)
}

// Exported for the check script — the parsing is the part worth testing.
export const __test = { parseCopy, contextBlock }

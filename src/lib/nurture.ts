/**
 * AI Nurture Engine
 * Manages automated follow-up touchpoints for proposals.
 * Uses Claude API to generate personalised email content and nurture plans
 * on behalf of Stuart Grant, Grant's Estate Agents.
 */

import Anthropic from '@anthropic-ai/sdk'
import { getDb } from '@/lib/db'
import { getProposal, logActivity } from '@/lib/proposal-generator'
import { sendNurtureEmail } from '@/lib/email'

// --- Lazy Anthropic client with env check ---

let _anthropic: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY environment variable is not set. ' +
      'Set it in your .env.local file to enable AI nurture content generation.'
    )
  }
  if (!_anthropic) {
    _anthropic = new Anthropic()
  }
  return _anthropic
}

// --- Types ---

export interface NurturePlan {
  id: number
  proposal_id: string
  status: string
  created_at: string
  updated_at: string
}

export interface NurtureTouchpoint {
  id: number
  plan_id: number
  type: string
  day_number: number
  subject: string | null
  content: string | null
  talking_points: string | null
  scheduled_for: string
  completed_at: string | null
  status: string
  created_at: string
}

export interface DueTouchpoint extends NurtureTouchpoint {
  proposal_id: string
  plan_status: string
  client_name: string
  client_email: string
  property_address: string
}

// --- Touchpoint schedule template (fallback if Claude API is unavailable) ---

const TOUCHPOINT_SCHEDULE = [
  { dayOffset: 1, type: 'email', subject: 'Just wanted to make sure you received your proposal' },
  { dayOffset: 3, type: 'call', subject: 'Check in call with client' },
  { dayOffset: 7, type: 'email', subject: 'Have you had a chance to review?' },
  { dayOffset: 14, type: 'call', subject: 'Follow up call — gauge interest' },
  { dayOffset: 21, type: 'email', subject: "We'd love to help when you're ready" },
]

// --- System prompts for Claude ---

const NURTURE_SYSTEM_PROMPT = `You are writing follow-up emails on behalf of Stuart Grant, Principal of Grant's Estate Agents.

About Stuart and Grant's Estate Agents:
- Stuart Grant is the Principal of the Berwick and Pakenham offices
- Over 30 years of family heritage in south-east Melbourne real estate
- Offices in Berwick, Narre Warren, and Pakenham (City of Casey & Cardinia Shire)
- Stuart leads a high-achieving, results-focused team across two locations
- Known for a personal, hands-on approach — Stuart will work harder than any agent you have ever met
- Stuart's direct phone: 0438 554 522
- Office phone: 03 9767 3200
- Email: info@grantsea.com.au
- Website: grantsea.com.au
- Head Office: 1/5 Gloucester Avenue, Berwick VIC 3806

Brand guidelines:
- The brand colour is RED (#C41E2A) — NOT gold, NOT blue
- Tone: warm, genuine, professional — luxury real estate without being stuffy
- Stuart is relationship-first — never pushy or salesy
- Emails should feel like they come from a real person who genuinely cares about helping the client get the best result
- Use Australian English (colour, personalised, etc.)

Writing style:
- Short paragraphs, conversational but professional
- First person from Stuart's perspective
- Reference specific details about the property and client situation
- Include a soft call to action — "happy to have a chat", "give me a call", etc.
- Never use generic real estate jargon like "dream home" or "once in a lifetime"
- Keep emails to 3-4 short paragraphs maximum
- Sign off as "Stuart Grant" with "Grant's Estate Agents" underneath

Return ONLY the email body as HTML paragraphs using <p> tags. No subject line — just the body content starting with a greeting like "Hi [first name]".`

const PLAN_GENERATION_PROMPT = `You are a real estate nurture campaign planner for Stuart Grant, Principal of Grant's Estate Agents in south-east Melbourne.

Your job is to create a personalised follow-up plan for a vendor who has received a property sale proposal. The plan should feel natural and relationship-driven, not like a drip campaign.

Return a JSON array of 5 touchpoints. Each touchpoint must have:
- "day_number": number (day offset from when the proposal was sent)
- "type": "email" or "call"
- "subject": string (email subject line, or call purpose for call touchpoints)
- "body": string (for email touchpoints only — the email body as HTML <p> tags, written from Stuart's perspective)
- "talking_points": string[] (for call touchpoints only — 3-4 bullet points for Stuart to reference during the call)

The plan should follow this general pattern:
- Day 1: Thank you email — brief, warm, confirming they received the proposal
- Day 3: Check-in call — see if they have questions, gauge initial reaction
- Day 7: Market update email — share something relevant about their local market or area
- Day 14: Follow-up call — respectful check-in, see where they are in their decision
- Day 21: Final email — no pressure, leaving the door open

Important:
- Reference the specific property, client name, price guide, and method of sale
- Emails should be 3-4 short paragraphs max
- Call talking points should be natural conversation starters, not scripts
- Use Australian English (colour, personalised, etc.)
- Sign off emails as "Stuart Grant" with "Grant's Estate Agents" underneath
- Stuart's phone: 0438 554 522 | Office: 03 9767 3200

Return ONLY valid JSON — no markdown code fences, no extra text.`

// --- Core functions ---

/**
 * Generate a full nurture plan using Claude API.
 * Creates the plan in the database with AI-generated content for all touchpoints.
 */
export async function generateNurturePlan(proposalId: string): Promise<{ plan: NurturePlan; touchpoints: NurtureTouchpoint[] }> {
  const db = getDb()

  // Check if plan already exists
  const existing = db.prepare('SELECT id FROM nurture_plans WHERE proposal_id = ?').get(proposalId) as { id: number } | undefined
  if (existing) {
    const plan = db.prepare('SELECT * FROM nurture_plans WHERE id = ?').get(existing.id) as NurturePlan
    const touchpoints = db.prepare(
      'SELECT * FROM nurture_touchpoints WHERE plan_id = ? ORDER BY scheduled_for ASC'
    ).all(existing.id) as NurtureTouchpoint[]
    return { plan, touchpoints }
  }

  const proposal = await getProposal(proposalId)
  if (!proposal) {
    throw new Error(`Proposal ${proposalId} not found`)
  }

  const priceGuide = proposal.priceGuide
    ? `$${proposal.priceGuide.min.toLocaleString()} - $${proposal.priceGuide.max.toLocaleString()}`
    : 'not specified'

  const firstName = proposal.clientName.split(/\s+/)[0]
  const clientFirstNames = proposal.clientName.includes('&')
    ? proposal.clientName.split('&').map(n => n.trim().split(/\s+/)[0]).join(' and ')
    : firstName

  // Try to generate plan with Claude, fall back to template if API is unavailable
  let touchpointData: Array<{
    day_number: number
    type: string
    subject: string
    body?: string
    talking_points?: string[]
  }>

  try {
    const client = getAnthropicClient()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: PLAN_GENERATION_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Create a nurture plan for this vendor:

Client name: ${proposal.clientName} (use "${clientFirstNames}" in greetings)
Property address: ${proposal.propertyAddress}
Price guide: ${priceGuide}
Method of sale: ${proposal.methodOfSale || 'not yet decided'}

Return ONLY the JSON array.`,
        },
      ],
    })

    const textBlock = message.content.find((block) => block.type === 'text')
    if (!textBlock?.text) {
      throw new Error('Empty response from Claude API')
    }

    // Parse the JSON response, stripping any markdown fences
    const jsonText = textBlock.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    touchpointData = JSON.parse(jsonText)

    if (!Array.isArray(touchpointData) || touchpointData.length === 0) {
      throw new Error('Invalid response structure from Claude API')
    }
  } catch (err) {
    console.warn(
      '[nurture] Claude API unavailable for plan generation, using template:',
      err instanceof Error ? err.message : err
    )
    // Fall back to template-based plan
    touchpointData = TOUCHPOINT_SCHEDULE.map((tp) => ({
      day_number: tp.dayOffset,
      type: tp.type,
      subject: tp.subject,
    }))
  }

  // Create the plan in the database
  const result = db.prepare(
    'INSERT INTO nurture_plans (proposal_id, status) VALUES (?, ?)'
  ).run(proposalId, 'active')

  const planId = result.lastInsertRowid as number

  const now = new Date()
  const insertTouchpoint = db.prepare(
    'INSERT INTO nurture_touchpoints (plan_id, type, day_number, subject, content, talking_points, scheduled_for, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )

  const insertAll = db.transaction(() => {
    for (const tp of touchpointData) {
      const scheduledDate = new Date(now.getTime() + tp.day_number * 24 * 60 * 60 * 1000)
      insertTouchpoint.run(
        planId,
        tp.type,
        tp.day_number,
        tp.subject,
        tp.body || null,
        tp.talking_points ? JSON.stringify(tp.talking_points) : null,
        scheduledDate.toISOString(),
        'pending'
      )
    }
  })

  insertAll()

  logActivity(proposalId, 'nurture_created', `AI nurture plan created with ${touchpointData.length} touchpoints`)

  const plan = db.prepare('SELECT * FROM nurture_plans WHERE id = ?').get(planId) as NurturePlan
  const touchpoints = db.prepare(
    'SELECT * FROM nurture_touchpoints WHERE plan_id = ? ORDER BY scheduled_for ASC'
  ).all(planId) as NurtureTouchpoint[]

  return { plan, touchpoints }
}

/**
 * Create a nurture plan using the static template (no Claude API required).
 * Kept for backward compatibility and as a fallback.
 */
export function createNurturePlan(proposalId: string): { planId: number; touchpoints: number } {
  const db = getDb()

  const existing = db.prepare('SELECT id FROM nurture_plans WHERE proposal_id = ?').get(proposalId) as { id: number } | undefined
  if (existing) {
    return { planId: existing.id, touchpoints: 0 }
  }

  const result = db.prepare(
    'INSERT INTO nurture_plans (proposal_id, status) VALUES (?, ?)'
  ).run(proposalId, 'active')

  const planId = result.lastInsertRowid as number

  const now = new Date()
  const insertTouchpoint = db.prepare(
    'INSERT INTO nurture_touchpoints (plan_id, type, day_number, subject, scheduled_for, status) VALUES (?, ?, ?, ?, ?, ?)'
  )

  const insertAll = db.transaction(() => {
    for (const tp of TOUCHPOINT_SCHEDULE) {
      const scheduledDate = new Date(now.getTime() + tp.dayOffset * 24 * 60 * 60 * 1000)
      insertTouchpoint.run(planId, tp.type, tp.dayOffset, tp.subject, scheduledDate.toISOString(), 'pending')
    }
  })

  insertAll()

  logActivity(proposalId, 'nurture_created', `Nurture plan created with ${TOUCHPOINT_SCHEDULE.length} touchpoints`)

  return { planId, touchpoints: TOUCHPOINT_SCHEDULE.length }
}

/**
 * Generate personalised follow-up email content using Claude API.
 */
export async function generateNurtureContent(
  proposalId: string,
  touchpointType: string,
  touchpointSubject: string
): Promise<string> {
  const proposal = await getProposal(proposalId)
  if (!proposal) {
    throw new Error(`Proposal ${proposalId} not found`)
  }

  const daysSinceSent = proposal.sentAt
    ? Math.floor((Date.now() - new Date(proposal.sentAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const priceGuide = proposal.priceGuide
    ? `$${proposal.priceGuide.min.toLocaleString()} - $${proposal.priceGuide.max.toLocaleString()}`
    : 'not specified'

  const firstName = proposal.clientName.split(/\s+/)[0]
  const clientFirstNames = proposal.clientName.includes('&')
    ? proposal.clientName.split('&').map(n => n.trim().split(/\s+/)[0]).join(' and ')
    : firstName

  const fallbackHtml = `<p>Hi ${clientFirstNames},</p><p>I just wanted to touch base regarding your property at ${proposal.propertyAddress}. If you have any questions about the proposal or would like to discuss anything further, I am always happy to have a chat.</p><p>You can reach me directly on 0438 554 522 or at the office on 03 9767 3200.</p><p>Warm regards,<br>Stuart Grant<br>Grant's Estate Agents</p>`

  try {
    const client = getAnthropicClient()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: NURTURE_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Write a follow-up email for this specific context:

Client name: ${proposal.clientName} (use "${clientFirstNames}" in the greeting)
Property address: ${proposal.propertyAddress}
Price guide: ${priceGuide}
Method of sale: ${proposal.methodOfSale || 'not yet decided'}
Days since proposal was sent: ${daysSinceSent}
Email purpose: ${touchpointSubject}
Touchpoint type: ${touchpointType}

${daysSinceSent <= 2 ? 'This is an early follow-up — keep it brief and friendly. Just checking they received everything okay.' : ''}
${daysSinceSent >= 14 ? 'This is a later follow-up — be respectful of their decision timeline. No pressure, just letting them know you are still here to help.' : ''}

Remember: return ONLY HTML <p> tags with the email body. No subject line, no HTML document wrapper.`,
        },
      ],
    })

    const textBlock = message.content.find((block) => block.type === 'text')
    if (!textBlock?.text) {
      return fallbackHtml
    }

    return textBlock.text
  } catch (err) {
    console.error('[nurture] Claude API error generating content:', err instanceof Error ? err.message : err)
    return fallbackHtml
  }
}

/**
 * Execute a single nurture touchpoint by ID.
 * For email touchpoints: generates content (if needed) and sends via Resend.
 * For call touchpoints: marks as 'pending_call' — agent must complete manually.
 */
export async function executeNurtureTouchpoint(touchpointId: number): Promise<{ success: boolean; error?: string }> {
  const db = getDb()

  const tp = db.prepare(`
    SELECT t.*, p.proposal_id, p.status as plan_status
    FROM nurture_touchpoints t
    JOIN nurture_plans p ON t.plan_id = p.id
    WHERE t.id = ?
  `).get(touchpointId) as (NurtureTouchpoint & { proposal_id: string; plan_status: string }) | undefined

  if (!tp) {
    return { success: false, error: `Touchpoint ${touchpointId} not found` }
  }

  if (tp.status !== 'pending') {
    return { success: false, error: `Touchpoint ${touchpointId} is already ${tp.status}` }
  }

  const proposal = await getProposal(tp.proposal_id)
  if (!proposal) {
    db.prepare(
      "UPDATE nurture_touchpoints SET status = 'skipped', completed_at = datetime('now') WHERE id = ?"
    ).run(touchpointId)
    return { success: false, error: `Proposal ${tp.proposal_id} not found, touchpoint skipped` }
  }

  // Skip if proposal has been approved or rejected
  if (proposal.status === 'approved' || proposal.status === 'rejected') {
    db.prepare(
      "UPDATE nurture_touchpoints SET status = 'skipped', completed_at = datetime('now') WHERE id = ?"
    ).run(touchpointId)
    return { success: true, error: `Proposal is ${proposal.status}, touchpoint skipped` }
  }

  if (tp.type === 'email') {
    // Use pre-generated content if available, otherwise generate on the fly
    let bodyHtml = tp.content
    if (!bodyHtml) {
      bodyHtml = await generateNurtureContent(tp.proposal_id, tp.type, tp.subject || '')
    }

    const result = await sendNurtureEmail(proposal, tp.subject || 'Following up on your proposal', bodyHtml)

    if (result.success) {
      db.prepare(
        "UPDATE nurture_touchpoints SET status = 'sent', content = ?, completed_at = datetime('now') WHERE id = ?"
      ).run(bodyHtml, touchpointId)
      logActivity(tp.proposal_id, 'nurture_email_sent', `Nurture email sent: ${tp.subject}`)
      return { success: true }
    } else {
      return { success: false, error: result.error }
    }
  } else if (tp.type === 'call') {
    // Mark as pending_call — agent needs to make the call manually
    db.prepare(
      "UPDATE nurture_touchpoints SET status = 'pending_call' WHERE id = ?"
    ).run(touchpointId)
    logActivity(tp.proposal_id, 'call_reminder', `Call reminder: ${tp.subject}`)
    return { success: true }
  }

  return { success: false, error: `Unknown touchpoint type: ${tp.type}` }
}

/**
 * Get all due nurture touchpoints (due_date <= now AND status = 'pending').
 * Joins with nurture_plans and proposals for full context.
 */
export function getDueNurtureTouchpoints(): DueTouchpoint[] {
  const db = getDb()
  const now = new Date().toISOString()

  return db.prepare(`
    SELECT
      t.*,
      p.proposal_id,
      p.status as plan_status,
      pr.client_name,
      pr.client_email,
      pr.property_address
    FROM nurture_touchpoints t
    JOIN nurture_plans p ON t.plan_id = p.id
    JOIN proposals pr ON p.proposal_id = pr.id
    WHERE t.scheduled_for <= ?
      AND t.status = 'pending'
      AND p.status = 'active'
    ORDER BY t.scheduled_for ASC
  `).all(now) as DueTouchpoint[]
}

/**
 * Process the entire nurture queue.
 * For email touchpoints: auto-sends.
 * For call touchpoints: flags as pending_call (shows up in notifications).
 */
export async function processNurtureQueue(): Promise<{ processed: number; errors: number }> {
  const dueTouchpoints = getDueNurtureTouchpoints()

  let processed = 0
  let errors = 0

  for (const tp of dueTouchpoints) {
    try {
      const result = await executeNurtureTouchpoint(tp.id)
      if (result.success) {
        processed++
      } else {
        console.error(`[nurture] Error executing touchpoint ${tp.id}:`, result.error)
        errors++
      }
    } catch (err) {
      console.error(`[nurture] Error processing touchpoint ${tp.id}:`, err instanceof Error ? err.message : err)
      errors++
    }
  }

  if (dueTouchpoints.length > 0) {
    console.log(`[nurture] Processed ${processed} touchpoints, ${errors} errors`)
  }

  return { processed, errors }
}

/**
 * Alias for processNurtureQueue — kept for backward compatibility with cron.ts.
 */
export async function processDueTouchpoints(): Promise<{ processed: number; errors: number }> {
  return processNurtureQueue()
}

/**
 * Skip a touchpoint (mark as 'skipped').
 */
export function skipTouchpoint(touchpointId: number): boolean {
  const db = getDb()

  const tp = db.prepare(`
    SELECT t.*, p.proposal_id
    FROM nurture_touchpoints t
    JOIN nurture_plans p ON t.plan_id = p.id
    WHERE t.id = ?
  `).get(touchpointId) as (NurtureTouchpoint & { proposal_id: string }) | undefined

  if (!tp) return false
  if (tp.status === 'completed' || tp.status === 'sent') return false

  db.prepare(
    "UPDATE nurture_touchpoints SET status = 'skipped', completed_at = datetime('now') WHERE id = ?"
  ).run(touchpointId)

  logActivity(tp.proposal_id, 'nurture_skipped', `Touchpoint skipped: ${tp.subject}`)

  return true
}

/**
 * Mark a call touchpoint as completed.
 */
export function completeCallTouchpoint(touchpointId: number): boolean {
  const db = getDb()

  const tp = db.prepare(`
    SELECT t.*, p.proposal_id
    FROM nurture_touchpoints t
    JOIN nurture_plans p ON t.plan_id = p.id
    WHERE t.id = ?
  `).get(touchpointId) as (NurtureTouchpoint & { proposal_id: string }) | undefined

  if (!tp) return false
  if (tp.type !== 'call') return false

  db.prepare(
    "UPDATE nurture_touchpoints SET status = 'completed', completed_at = datetime('now') WHERE id = ?"
  ).run(touchpointId)

  logActivity(tp.proposal_id, 'call_completed', `Call completed: ${tp.subject}`)

  return true
}

/**
 * Get nurture plan and all touchpoints for a proposal.
 */
export function getNurturePlan(proposalId: string): { plan: NurturePlan; touchpoints: NurtureTouchpoint[] } | null {
  const db = getDb()

  const plan = db.prepare('SELECT * FROM nurture_plans WHERE proposal_id = ?').get(proposalId) as NurturePlan | undefined
  if (!plan) return null

  const touchpoints = db.prepare(
    'SELECT * FROM nurture_touchpoints WHERE plan_id = ? ORDER BY scheduled_for ASC'
  ).all(plan.id) as NurtureTouchpoint[]

  return { plan, touchpoints }
}

/**
 * Get all active nurture plans with their touchpoints.
 */
export function getAllNurturePlans(): Array<{ plan: NurturePlan; touchpoints: NurtureTouchpoint[]; proposal_id: string; client_name: string; property_address: string }> {
  const db = getDb()

  const plans = db.prepare(`
    SELECT np.*, pr.client_name, pr.property_address
    FROM nurture_plans np
    JOIN proposals pr ON np.proposal_id = pr.id
    WHERE np.status IN ('active', 'paused')
    ORDER BY np.created_at DESC
  `).all() as (NurturePlan & { client_name: string; property_address: string })[]

  return plans.map((plan) => {
    const touchpoints = db.prepare(
      'SELECT * FROM nurture_touchpoints WHERE plan_id = ? ORDER BY scheduled_for ASC'
    ).all(plan.id) as NurtureTouchpoint[]

    return {
      plan: {
        id: plan.id,
        proposal_id: plan.proposal_id,
        status: plan.status,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
      },
      touchpoints,
      proposal_id: plan.proposal_id,
      client_name: plan.client_name,
      property_address: plan.property_address,
    }
  })
}

/**
 * Pause a nurture plan — no touchpoints will be processed while paused.
 */
export function pauseNurturePlan(proposalId: string): boolean {
  const db = getDb()
  const result = db.prepare(
    "UPDATE nurture_plans SET status = 'paused', updated_at = datetime('now') WHERE proposal_id = ? AND status = 'active'"
  ).run(proposalId)

  if (result.changes > 0) {
    logActivity(proposalId, 'nurture_paused', 'Nurture plan paused')
    return true
  }
  return false
}

/**
 * Resume a paused nurture plan.
 */
export function resumeNurturePlan(proposalId: string): boolean {
  const db = getDb()
  const result = db.prepare(
    "UPDATE nurture_plans SET status = 'active', updated_at = datetime('now') WHERE proposal_id = ? AND status = 'paused'"
  ).run(proposalId)

  if (result.changes > 0) {
    logActivity(proposalId, 'nurture_resumed', 'Nurture plan resumed')
    return true
  }
  return false
}

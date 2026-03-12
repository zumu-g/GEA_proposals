/**
 * Email Intake: polls AgentMail inbox for new proposal requests,
 * parses email body for property details, and creates proposals.
 *
 * Expected email format:
 *   Subject: New Proposal - 171 Greaves Rd, Narre Warren South VIC 3805
 *   Body (plain text, flexible key:value parsing):
 *     Client: James & Sarah Mitchell
 *     Email: james@example.com
 *     Address: 171 Greaves Rd, Narre Warren South VIC 3805
 *     Price Guide: $1,650,000 - $1,850,000
 *     Method: Auction
 *     Commission: 1.8%
 *     Marketing Budget: $10,000
 *
 * Attachments: hero image (jpg/png), CSV of comparable sales
 */

import { createProposal, parseCSV } from './spreadsheet-parser'
import { saveProposal, getAgencyConfig, logActivity } from './proposal-generator'
import { getDb } from './db'
import { Proposal } from '@/types/proposal'

const API_BASE = 'https://api.agentmail.to/v0'
const INBOX_ID = process.env.AGENTMAIL_INBOX || 'newproposal@agentmail.to'

function getApiKey(): string {
  const key = process.env.AGENTMAIL_API_KEY
  if (!key) throw new Error('AGENTMAIL_API_KEY not set')
  return key
}

async function agentMailFetch(path: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  })
  if (!res.ok) {
    throw new Error(`AgentMail API ${res.status}: ${await res.text()}`)
  }
  return res.json()
}

async function agentMailPost(path: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`AgentMail API ${res.status}: ${await res.text()}`)
  }
  return res.json()
}

// --- AgentMail message types (snake_case from API) ---

interface AgentMailMessage {
  message_id: string
  subject?: string
  from?: string
  to?: string[]
  text?: string
  html?: string
  extracted_text?: string
  preview?: string
  attachments?: Array<{
    attachment_id: string
    filename: string
    content_type: string
    size?: number
  }>
  labels?: string[]
  created_at?: string
}

interface AgentMailListResponse {
  count: number
  limit: number
  messages: AgentMailMessage[]
}

// --- Parse email body into structured fields ---

interface ParsedBrief {
  clientName?: string
  clientEmail?: string
  propertyAddress?: string
  priceGuideMin?: number
  priceGuideMax?: number
  methodOfSale?: string
  commissionRate?: number
  marketingBudget?: string
}

function parseEmailBody(text: string): ParsedBrief {
  const brief: ParsedBrief = {}
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/i)
    if (!match) continue

    const key = match[1].toLowerCase().trim()
    const value = match[2].trim()

    if (key.includes('client') || key === 'name' || key === 'vendor') {
      brief.clientName = value
    } else if (key.includes('email') || key === 'mail') {
      brief.clientEmail = value
    } else if (key.includes('address') || key === 'property') {
      brief.propertyAddress = value
    } else if (key.includes('price') || key.includes('guide')) {
      const prices = value.replace(/[,$\s]/g, '').match(/(\d+)/g)
      if (prices && prices.length >= 2) {
        brief.priceGuideMin = parseInt(prices[0])
        brief.priceGuideMax = parseInt(prices[1])
      } else if (prices && prices.length === 1) {
        brief.priceGuideMin = parseInt(prices[0])
        brief.priceGuideMax = parseInt(prices[0])
      }
    } else if (key.includes('method') || key.includes('sale type')) {
      brief.methodOfSale = value
    } else if (key.includes('commission') || key === 'rate') {
      const rate = parseFloat(value.replace(/[%]/g, ''))
      if (!isNaN(rate)) brief.commissionRate = rate
    } else if (key.includes('marketing') || key.includes('budget')) {
      brief.marketingBudget = value
    }
  }

  return brief
}

function parseSubject(subject: string): string | undefined {
  const match = subject.match(/(?:proposal|new|listing)[:\s-]+(.+)/i)
  return match ? match[1].trim() : undefined
}

// --- Process a single email into a proposal ---

interface ProcessResult {
  success: boolean
  proposalId?: string
  proposalUrl?: string
  error?: string
}

async function processEmail(message: AgentMailMessage): Promise<ProcessResult> {
  // List endpoint returns preview, fetch full message for text/attachments
  let fullMsg = message
  if (!fullMsg.text && !fullMsg.extracted_text) {
    try {
      fullMsg = (await agentMailFetch(
        `/inboxes/${INBOX_ID}/messages/${message.message_id}`
      )) as AgentMailMessage
    } catch {
      // Fall back to preview
    }
  }

  const body = fullMsg.extracted_text || fullMsg.text || fullMsg.preview || ''
  const brief = parseEmailBody(body)

  // Fallback: address from subject
  if (!brief.propertyAddress && fullMsg.subject) {
    brief.propertyAddress = parseSubject(fullMsg.subject)
  }

  // Fallback: sender email
  if (!brief.clientEmail && fullMsg.from) {
    brief.clientEmail = fullMsg.from
  }

  if (!brief.propertyAddress) {
    return { success: false, error: 'No property address found in email' }
  }

  if (!brief.clientName) brief.clientName = 'Vendor'
  if (!brief.clientEmail) brief.clientEmail = ''

  const agencyConfig = await getAgencyConfig()

  // Process CSV attachments
  let spreadsheetRows
  if (fullMsg.attachments) {
    for (const att of fullMsg.attachments) {
      if (att.content_type === 'text/csv' || att.filename?.endsWith('.csv')) {
        try {
          const attRes = await fetch(
            `${API_BASE}/inboxes/${INBOX_ID}/messages/${fullMsg.message_id}/attachments/${att.attachment_id}`,
            { headers: { Authorization: `Bearer ${getApiKey()}` } }
          )
          if (attRes.ok) {
            const csvText = await attRes.text()
            spreadsheetRows = parseCSV(csvText)
          }
        } catch (err) {
          console.error(`Failed to fetch CSV attachment: ${att.filename}`, err)
        }
      }
    }
  }

  // Build proposal
  const proposal = createProposal({
    clientName: brief.clientName,
    clientEmail: brief.clientEmail,
    propertyAddress: brief.propertyAddress,
    spreadsheetRows,
    fees: {
      commissionRate: brief.commissionRate || agencyConfig.defaultCommissionRate,
      inclusions: (agencyConfig as { defaultInclusions?: string[] }).defaultInclusions,
      marketingBudget: brief.marketingBudget,
    },
    agency: agencyConfig,
  })

  // Add price guide and method if provided
  if (brief.priceGuideMin && brief.priceGuideMax) {
    (proposal as Proposal).priceGuide = {
      min: brief.priceGuideMin,
      max: brief.priceGuideMax,
    }
  }
  if (brief.methodOfSale) {
    proposal.methodOfSale = brief.methodOfSale
  }

  await saveProposal(proposal)
  logActivity(proposal.id, 'created', `Created from email: ${message.subject}`, {
    source: 'agentmail',
    messageId: message.message_id,
    from: message.from,
  })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:4777'
  const proposalUrl = `${baseUrl}/proposal/${proposal.id}`

  return { success: true, proposalId: proposal.id, proposalUrl }
}

// --- Duplicate detection ---

function isMessageProcessed(message_id: string): boolean {
  const db = getDb()
  const row = db
    .prepare("SELECT 1 FROM activities WHERE metadata LIKE ? AND type = 'created'")
    .get(`%"messageId":"${message_id}"%`)
  return !!row
}

// --- Poll inbox and process new messages ---

export async function pollInbox(): Promise<{
  processed: number
  errors: number
  results: ProcessResult[]
}> {
  const results: ProcessResult[] = []
  let processed = 0
  let errors = 0

  try {
    const response = (await agentMailFetch(
      `/inboxes/${INBOX_ID}/messages?limit=20`
    )) as AgentMailListResponse

    for (const msg of response.messages) {
      // Skip replies (our own auto-replies)
      if (msg.subject?.startsWith('Re:') || msg.subject?.startsWith('RE:')) continue

      // Skip already processed
      if (isMessageProcessed(msg.message_id)) continue

      console.log(`Processing email: "${msg.subject}" from ${msg.from}`)

      const result = await processEmail(msg)
      results.push(result)

      if (result.success) {
        processed++

        // Reply with proposal link
        try {
          await agentMailPost(
            `/inboxes/${INBOX_ID}/messages/${msg.message_id}/reply`,
            {
              text: `Your proposal has been created!\n\nView it here: ${result.proposalUrl}\n\nProposal ID: ${result.proposalId}`,
              html: `
                <div style="font-family: Inter, sans-serif; max-width: 500px;">
                  <div style="background: #2D3830; padding: 24px; border-radius: 12px 12px 0 0;">
                    <h2 style="color: #fff; margin: 0; font-size: 20px;">Proposal Created</h2>
                  </div>
                  <div style="background: #fff; padding: 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
                    <p style="color: #333; font-size: 14px; line-height: 1.6;">
                      Your proposal has been generated and is ready to review.
                    </p>
                    <a href="${result.proposalUrl}" style="display: inline-block; background: #1A1A1A; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin: 16px 0;">
                      View Proposal
                    </a>
                    <p style="color: #888; font-size: 12px; margin-top: 16px;">
                      Proposal ID: ${result.proposalId}
                    </p>
                  </div>
                </div>
              `,
            }
          )
        } catch (replyErr) {
          console.error('Failed to send reply:', replyErr)
        }
      } else {
        errors++
        console.error(`Failed to process email "${msg.subject}": ${result.error}`)
      }
    }
  } catch (err) {
    console.error('Failed to poll inbox:', err)
    errors++
  }

  return { processed, errors, results }
}

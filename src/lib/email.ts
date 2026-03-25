import { Resend } from 'resend'
import { Proposal } from '@/types/proposal'
import { escapeHtml } from '@/lib/utils'

let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    _resend = new Resend(apiKey)
  }
  return _resend
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

function getProposalUrl(proposalId: string): string {
  return `${BASE_URL}/proposal/${proposalId}`
}

export async function sendProposalEmail(proposal: Proposal): Promise<{ success: boolean; error?: string }> {
  const agencyName = proposal.agency?.name || "Grant's Estate Agents"
  const proposalUrl = getProposalUrl(proposal.id)

  try {
    const { error } = await getResend().emails.send({
      from: `${agencyName} <${FROM_EMAIL}>`,
      to: [proposal.clientEmail],
      subject: `Your Property Sale Proposal — ${proposal.propertyAddress}`,
      html: buildProposalEmailHtml({
        clientName: proposal.clientName,
        propertyAddress: proposal.propertyAddress,
        agencyName,
        proposalUrl,
        contactEmail: proposal.agency?.contactEmail,
        contactPhone: proposal.agency?.contactPhone,
      }),
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Email send error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send email' }
  }
}

export async function sendNurtureEmail(
  proposal: Proposal,
  subject: string,
  bodyHtml: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getResend().emails.send({
      from: `Stuart Grant - Grant's Estate Agents <${FROM_EMAIL}>`,
      to: [proposal.clientEmail],
      subject,
      html: buildNurtureEmailHtml({
        propertyAddress: proposal.propertyAddress,
        bodyHtml,
      }),
    })

    if (error) {
      console.error('Nurture email error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Nurture email send error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send nurture email' }
  }
}

export async function sendApprovalNotification(proposal: Proposal): Promise<{ success: boolean; error?: string }> {
  const agencyEmail = proposal.agency?.contactEmail || process.env.AGENCY_EMAIL
  const agencyName = proposal.agency?.name || "Grant's Estate Agents"
  const proposalUrl = getProposalUrl(proposal.id)
  const results: { type: string; success: boolean; error?: string }[] = []

  // 1. Send detailed notification to the AGENT
  if (agencyEmail) {
    try {
      const { error } = await getResend().emails.send({
        from: `GEA Proposals <${FROM_EMAIL}>`,
        to: [agencyEmail],
        subject: `✅ Proposal Approved — ${proposal.propertyAddress}`,
        html: buildAgentApprovalHtml(proposal, proposalUrl),
      })
      if (error) {
        console.error('Agent approval email error:', error)
        results.push({ type: 'agent', success: false, error: error.message })
      } else {
        console.log(`Agent approval notification sent to ${agencyEmail}`)
        results.push({ type: 'agent', success: true })
      }
    } catch (err) {
      console.error('Agent approval email error:', err)
      results.push({ type: 'agent', success: false, error: err instanceof Error ? err.message : 'Failed' })
    }
  } else {
    console.log('No agency email configured, skipping agent notification')
  }

  // 2. Send confirmation to the CLIENT (owner)
  if (proposal.clientEmail) {
    try {
      const { error } = await getResend().emails.send({
        from: `${agencyName} <${FROM_EMAIL}>`,
        to: [proposal.clientEmail],
        subject: `Thank You — ${proposal.propertyAddress}`,
        html: buildClientApprovalHtml(proposal, proposalUrl, agencyName),
      })
      if (error) {
        console.error('Client approval email error:', error)
        results.push({ type: 'client', success: false, error: error.message })
      } else {
        console.log(`Client approval confirmation sent to ${proposal.clientEmail}`)
        results.push({ type: 'client', success: true })
      }
    } catch (err) {
      console.error('Client approval email error:', err)
      results.push({ type: 'client', success: false, error: err instanceof Error ? err.message : 'Failed' })
    }
  }

  const anySuccess = results.some(r => r.success)
  const errors = results.filter(r => !r.success).map(r => `${r.type}: ${r.error}`).join('; ')
  return { success: anySuccess, error: errors || undefined }
}

// --- HTML Templates ---

interface ProposalEmailData {
  clientName: string
  propertyAddress: string
  agencyName: string
  proposalUrl: string
  contactEmail?: string
  contactPhone?: string
}

function buildProposalEmailHtml(data: ProposalEmailData): string {
  const agency = escapeHtml(data.agencyName)
  const address = escapeHtml(data.propertyAddress)
  const client = escapeHtml(data.clientName)
  const url = escapeHtml(data.proposalUrl)
  const email = data.contactEmail ? escapeHtml(data.contactEmail) : ''
  const phone = data.contactPhone ? escapeHtml(data.contactPhone) : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Property Sale Proposal</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAFAFA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAFAFA;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Red accent line -->
          <tr>
            <td style="background-color: #C41E2A; height: 4px; font-size: 0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="background-color: #1A1A1A; padding: 48px 40px 40px 40px;">
              <p style="color: #C41E2A; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 24px 0;">
                ${agency}
              </p>
              <h1 style="color: #FFFFFF; font-size: 28px; font-weight: 400; margin: 0 0 16px 0; line-height: 1.3; text-transform: lowercase;">
                ${address.toLowerCase()}
              </h1>
              <div style="width: 60px; height: 2px; background-color: #C41E2A; margin: 0 0 24px 0;"></div>
              <p style="color: rgba(255,255,255,0.7); font-size: 16px; font-weight: 300; margin: 0;">
                prepared for <span style="color: #FFFFFF; font-weight: 400;">${client}</span>
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 40px;">
              <p style="color: #4A4A4A; font-size: 16px; line-height: 1.7; font-weight: 300; margin: 0 0 16px 0;">
                Dear ${client},
              </p>
              <p style="color: #4A4A4A; font-size: 16px; line-height: 1.7; font-weight: 300; margin: 0 0 24px 0;">
                Your personalised property sale proposal is ready to view. We've prepared a comprehensive overview including our marketing approach, the sale process, and comparable properties in your area.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td>
                    <a href="${url}" target="_blank"
                       style="display: inline-block; background-color: #C41E2A; color: #FFFFFF; text-decoration: none; padding: 16px 32px; font-size: 16px; font-weight: 500; letter-spacing: 0.5px; border-radius: 4px;">
                      view your proposal
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #737373; font-size: 14px; line-height: 1.6; font-weight: 300; margin: 24px 0 0 0;">
                If the button above doesn't work, copy and paste this link into your browser:<br>
                <a href="${url}" style="color: #C41E2A; text-decoration: none; word-break: break-all;">${url}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1A1A1A; padding: 32px 40px;">
              <p style="color: rgba(255,255,255,0.5); font-size: 14px; font-weight: 300; margin: 0 0 8px 0;">
                ${agency.toLowerCase()}
              </p>
              ${email ? `<p style="color: rgba(255,255,255,0.3); font-size: 13px; font-weight: 300; margin: 0 0 4px 0;">${email}</p>` : ''}
              ${phone ? `<p style="color: rgba(255,255,255,0.3); font-size: 13px; font-weight: 300; margin: 0;">${phone}</p>` : ''}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

interface NurtureEmailData {
  propertyAddress: string
  bodyHtml: string
}

function buildNurtureEmailHtml(data: NurtureEmailData): string {
  const address = escapeHtml(data.propertyAddress)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #FAFAFA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAFAFA;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Red accent line -->
          <tr>
            <td style="background-color: #C41E2A; height: 4px; font-size: 0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="background-color: #1A1A1A; padding: 32px 40px;">
              <p style="color: #C41E2A; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 12px 0;">
                grant's estate agents
              </p>
              <p style="color: rgba(255,255,255,0.5); font-size: 14px; font-weight: 300; margin: 0; text-transform: lowercase;">
                ${address.toLowerCase()}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 40px;">
              <div style="color: #4A4A4A; font-size: 16px; line-height: 1.7; font-weight: 300;">
                ${data.bodyHtml}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1A1A1A; padding: 32px 40px;">
              <p style="color: rgba(255,255,255,0.7); font-size: 14px; font-weight: 300; margin: 0 0 4px 0;">
                Stuart Grant
              </p>
              <p style="color: rgba(255,255,255,0.5); font-size: 13px; font-weight: 300; margin: 0 0 12px 0;">
                Principal — Grant's Estate Agents
              </p>
              <p style="color: rgba(255,255,255,0.3); font-size: 13px; font-weight: 300; margin: 0 0 4px 0;">
                <a href="tel:0438554522" style="color: rgba(255,255,255,0.4); text-decoration: none;">0438 554 522</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="tel:0397673200" style="color: rgba(255,255,255,0.4); text-decoration: none;">03 9767 3200</a>
              </p>
              <p style="color: rgba(255,255,255,0.3); font-size: 13px; font-weight: 300; margin: 0 0 4px 0;">
                <a href="mailto:info@grantsea.com.au" style="color: rgba(255,255,255,0.4); text-decoration: none;">info@grantsea.com.au</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="https://grantsea.com.au" style="color: rgba(255,255,255,0.4); text-decoration: none;">grantsea.com.au</a>
              </p>
              <p style="color: rgba(255,255,255,0.3); font-size: 12px; font-weight: 300; margin: 0;">
                1/5 Gloucester Avenue, Berwick VIC 3806
              </p>
            </td>
          </tr>

          <!-- Unsubscribe -->
          <tr>
            <td style="padding: 16px 40px; background-color: #F5F5F5;">
              <p style="color: #A3A3A3; font-size: 11px; font-weight: 300; margin: 0; text-align: center;">
                Grant's Estate Agents Pty Ltd | ABN 80 595 235 807<br>
                Berwick&nbsp;&nbsp;|&nbsp;&nbsp;Narre Warren&nbsp;&nbsp;|&nbsp;&nbsp;Pakenham<br>
                <a href="mailto:info@grantsea.com.au?subject=Unsubscribe" style="color: #A3A3A3; text-decoration: underline;">Unsubscribe</a> from follow-up emails
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Helper: format price ────────────────────────────────────────────────────
function fmtPrice(num: number | undefined): string {
  if (!num) return '—'
  return '$' + num.toLocaleString('en-AU')
}

function fmtPercent(num: number | undefined): string {
  if (!num) return '—'
  return num + '%'
}

// ─── AGENT approval email (comprehensive details) ───────────────────────────
function buildAgentApprovalHtml(proposal: Proposal, proposalUrl: string): string {
  const client = escapeHtml(proposal.clientName)
  const clientEmail = escapeHtml(proposal.clientEmail)
  const address = escapeHtml(proposal.propertyAddress)
  const url = escapeHtml(proposalUrl)
  const method = escapeHtml(proposal.methodOfSale || 'TBC')
  const priceMin = proposal.priceGuide?.min
  const priceMax = proposal.priceGuide?.max
  const commission = proposal.fees?.commissionRate
  const marketingBudget = proposal.fees?.marketingBudget
  const totalAdCost = proposal.totalAdvertisingCost

  // Build marketing items rows
  let marketingRows = ''
  if (proposal.marketingPlan && proposal.marketingPlan.length > 0) {
    for (const item of proposal.marketingPlan) {
      marketingRows += `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #F0F0F0; color: #1A1A1A; font-size: 14px;">${escapeHtml(item.channel)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #F0F0F0; color: #737373; font-size: 13px;">${escapeHtml(item.description)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #F0F0F0; color: #1A1A1A; font-size: 13px; text-align: right;">${item.cost ? escapeHtml(item.cost) : 'Included'}</td>
        </tr>`
    }
  }

  // Build advertising schedule rows
  let scheduleRows = ''
  if (proposal.advertisingSchedule && proposal.advertisingSchedule.length > 0) {
    for (const week of proposal.advertisingSchedule) {
      const activities = week.activities.map(a => escapeHtml(a.category)).join(', ')
      const weekCost = week.activities.reduce((sum, a) => sum + (a.cost || 0), 0)
      scheduleRows += `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #F0F0F0; color: #1A1A1A; font-size: 14px; font-weight: 500;">Week ${week.week}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #F0F0F0; color: #737373; font-size: 13px;">${activities}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #F0F0F0; color: #1A1A1A; font-size: 13px; text-align: right;">${weekCost ? fmtPrice(weekCost) : '—'}</td>
        </tr>`
    }
  }

  // Build comparable sales rows
  let comparablesRows = ''
  if (proposal.recentSales && proposal.recentSales.length > 0) {
    for (const sale of proposal.recentSales.slice(0, 8)) {
      comparablesRows += `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #F0F0F0; color: #1A1A1A; font-size: 13px;">${escapeHtml(sale.address)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #F0F0F0; color: #C41E2A; font-size: 13px; font-weight: 600;">${fmtPrice(sale.price)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #F0F0F0; color: #737373; font-size: 13px;">${sale.bedrooms}bd ${sale.bathrooms}ba</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #F0F0F0; color: #737373; font-size: 13px;">${escapeHtml(sale.date)}</td>
        </tr>`
    }
  }

  // Fee inclusions
  let inclusionsHtml = ''
  if (proposal.fees?.inclusions && proposal.fees.inclusions.length > 0) {
    inclusionsHtml = proposal.fees.inclusions.map(i => `<li style="color: #4A4A4A; font-size: 14px; margin: 4px 0;">${escapeHtml(i)}</li>`).join('')
    inclusionsHtml = `<ul style="margin: 8px 0 0 0; padding-left: 20px;">${inclusionsHtml}</ul>`
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #FAFAFA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAFAFA;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Red accent line -->
          <tr>
            <td style="background-color: #C41E2A; height: 4px; font-size: 0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="background-color: #1A1A1A; padding: 40px;">
              <p style="color: #C41E2A; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 16px 0;">proposal approved</p>
              <h1 style="color: #FFFFFF; font-size: 26px; font-weight: 400; margin: 0 0 12px 0; text-transform: lowercase; line-height: 1.3;">
                ${address.toLowerCase()}
              </h1>
              <p style="color: rgba(255,255,255,0.5); font-size: 14px; font-weight: 300; margin: 0;">
                approved ${new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </td>
          </tr>

          <!-- Client details -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 32px 40px; border-bottom: 1px solid #F0F0F0;">
              <p style="color: #737373; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 16px 0;">client details</p>
              <table cellpadding="0" cellspacing="0" style="width: 100%;">
                <tr>
                  <td style="padding: 6px 0; color: #737373; font-size: 13px; width: 120px;">Name</td>
                  <td style="padding: 6px 0; color: #1A1A1A; font-size: 14px; font-weight: 500;">${client}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #737373; font-size: 13px;">Email</td>
                  <td style="padding: 6px 0;"><a href="mailto:${clientEmail}" style="color: #C41E2A; text-decoration: none; font-size: 14px;">${clientEmail}</a></td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #737373; font-size: 13px;">Property</td>
                  <td style="padding: 6px 0; color: #1A1A1A; font-size: 14px;">${address}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Sale details -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 32px 40px; border-bottom: 1px solid #F0F0F0;">
              <p style="color: #737373; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 16px 0;">sale details</p>
              <table cellpadding="0" cellspacing="0" style="width: 100%;">
                <tr>
                  <td style="padding: 6px 0; color: #737373; font-size: 13px; width: 120px;">Method</td>
                  <td style="padding: 6px 0; color: #1A1A1A; font-size: 14px; font-weight: 500;">${method}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #737373; font-size: 13px;">Price Guide</td>
                  <td style="padding: 6px 0; color: #1A1A1A; font-size: 14px; font-weight: 500;">${priceMin && priceMax ? fmtPrice(priceMin) + ' — ' + fmtPrice(priceMax) : priceMin ? fmtPrice(priceMin) + '+' : priceMax ? 'Up to ' + fmtPrice(priceMax) : '—'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #737373; font-size: 13px;">Commission</td>
                  <td style="padding: 6px 0; color: #1A1A1A; font-size: 14px; font-weight: 500;">${fmtPercent(commission)}${commission && priceMin ? ' (est. ' + fmtPrice(Math.round((priceMin + (priceMax || priceMin)) / 2 * (commission / 100))) + ')' : ''}</td>
                </tr>
                ${marketingBudget ? `<tr>
                  <td style="padding: 6px 0; color: #737373; font-size: 13px;">Marketing Budget</td>
                  <td style="padding: 6px 0; color: #1A1A1A; font-size: 14px; font-weight: 500;">${escapeHtml(marketingBudget)}</td>
                </tr>` : ''}
              </table>
              ${inclusionsHtml}
            </td>
          </tr>

          ${marketingRows ? `
          <!-- Marketing campaign -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 32px 40px; border-bottom: 1px solid #F0F0F0;">
              <p style="color: #737373; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 16px 0;">marketing campaign</p>
              <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #F9F9F9;">
                  <td style="padding: 8px 12px; font-size: 11px; color: #737373; text-transform: uppercase; letter-spacing: 1px;">Channel</td>
                  <td style="padding: 8px 12px; font-size: 11px; color: #737373; text-transform: uppercase; letter-spacing: 1px;">Details</td>
                  <td style="padding: 8px 12px; font-size: 11px; color: #737373; text-transform: uppercase; letter-spacing: 1px; text-align: right;">Cost</td>
                </tr>
                ${marketingRows}
              </table>
            </td>
          </tr>` : ''}

          ${scheduleRows ? `
          <!-- Advertising schedule -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 32px 40px; border-bottom: 1px solid #F0F0F0;">
              <p style="color: #737373; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 16px 0;">advertising schedule</p>
              <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #F9F9F9;">
                  <td style="padding: 8px 12px; font-size: 11px; color: #737373; text-transform: uppercase; letter-spacing: 1px;">Week</td>
                  <td style="padding: 8px 12px; font-size: 11px; color: #737373; text-transform: uppercase; letter-spacing: 1px;">Activities</td>
                  <td style="padding: 8px 12px; font-size: 11px; color: #737373; text-transform: uppercase; letter-spacing: 1px; text-align: right;">Cost</td>
                </tr>
                ${scheduleRows}
              </table>
              ${totalAdCost ? `<p style="color: #1A1A1A; font-size: 14px; font-weight: 600; margin: 12px 0 0 0; text-align: right;">Total: ${fmtPrice(totalAdCost)}</p>` : ''}
            </td>
          </tr>` : ''}

          ${comparablesRows ? `
          <!-- Comparable sales -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 32px 40px; border-bottom: 1px solid #F0F0F0;">
              <p style="color: #737373; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 16px 0;">comparable sales</p>
              <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #F9F9F9;">
                  <td style="padding: 8px 12px; font-size: 11px; color: #737373; text-transform: uppercase; letter-spacing: 1px;">Address</td>
                  <td style="padding: 8px 12px; font-size: 11px; color: #737373; text-transform: uppercase; letter-spacing: 1px;">Price</td>
                  <td style="padding: 8px 12px; font-size: 11px; color: #737373; text-transform: uppercase; letter-spacing: 1px;">Spec</td>
                  <td style="padding: 8px 12px; font-size: 11px; color: #737373; text-transform: uppercase; letter-spacing: 1px;">Sold</td>
                </tr>
                ${comparablesRows}
              </table>
            </td>
          </tr>` : ''}

          <!-- CTA -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 24px 40px 32px 40px;">
              <a href="${url}" target="_blank"
                 style="display: inline-block; background-color: #C41E2A; color: #FFFFFF; text-decoration: none; padding: 14px 32px; font-size: 14px; font-weight: 500; border-radius: 4px;">
                view full proposal
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #1A1A1A;">
              <p style="color: rgba(255,255,255,0.4); font-size: 12px; font-weight: 300; margin: 0;">
                Automated notification from GEA Proposals
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── CLIENT approval confirmation email ──────────────────────────────────────
function buildClientApprovalHtml(proposal: Proposal, proposalUrl: string, agencyName: string): string {
  const client = escapeHtml(proposal.clientName)
  const address = escapeHtml(proposal.propertyAddress)
  const url = escapeHtml(proposalUrl)
  const agency = escapeHtml(agencyName)
  const method = escapeHtml(proposal.methodOfSale || 'TBC')
  const priceMin = proposal.priceGuide?.min
  const priceMax = proposal.priceGuide?.max
  const commission = proposal.fees?.commissionRate
  const agentName = proposal.agency?.agentName || 'Stuart Grant'
  const agentPhone = proposal.agency?.agentPhone || proposal.agency?.contactPhone || '0438 554 522'
  const agentEmail = proposal.agency?.contactEmail || 'info@grantsea.com.au'
  const totalAdCost = proposal.totalAdvertisingCost

  // Marketing summary
  let marketingSummary = ''
  if (proposal.marketingPlan && proposal.marketingPlan.length > 0) {
    const items = proposal.marketingPlan.map(m => `<li style="color: #4A4A4A; font-size: 14px; line-height: 1.8;">${escapeHtml(m.channel)}${m.cost ? ' — ' + escapeHtml(m.cost) : ''}</li>`).join('')
    marketingSummary = `<ul style="margin: 8px 0 0 0; padding-left: 20px;">${items}</ul>`
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #FAFAFA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAFAFA;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Red accent line -->
          <tr>
            <td style="background-color: #C41E2A; height: 4px; font-size: 0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="background-color: #1A1A1A; padding: 48px 40px 40px 40px;">
              <p style="color: #C41E2A; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 24px 0;">${agency}</p>
              <h1 style="color: #FFFFFF; font-size: 28px; font-weight: 400; margin: 0 0 12px 0; line-height: 1.3; text-transform: lowercase;">
                thank you, ${client.split(' ')[0].toLowerCase()}
              </h1>
              <div style="width: 60px; height: 2px; background-color: #C41E2A; margin: 0 0 20px 0;"></div>
              <p style="color: rgba(255,255,255,0.6); font-size: 15px; font-weight: 300; margin: 0;">
                your proposal for ${address.toLowerCase()} has been confirmed
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 40px;">
              <p style="color: #4A4A4A; font-size: 16px; line-height: 1.7; font-weight: 300; margin: 0 0 24px 0;">
                Dear ${client},
              </p>
              <p style="color: #4A4A4A; font-size: 16px; line-height: 1.7; font-weight: 300; margin: 0 0 24px 0;">
                Thank you for choosing ${agency.toLowerCase()} to sell your property. We're excited to get started and will be in touch shortly to discuss next steps.
              </p>
              <p style="color: #4A4A4A; font-size: 16px; line-height: 1.7; font-weight: 300; margin: 0 0 32px 0;">
                Below is a summary of what was agreed:
              </p>

              <!-- Summary box -->
              <table cellpadding="0" cellspacing="0" style="width: 100%; background-color: #F9F9F9; border-radius: 8px; overflow: hidden; margin: 0 0 32px 0;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="color: #737373; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 16px 0;">agreed terms</p>
                    <table cellpadding="0" cellspacing="0" style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0; color: #737373; font-size: 13px; width: 140px; vertical-align: top;">Property</td>
                        <td style="padding: 8px 0; color: #1A1A1A; font-size: 14px; font-weight: 500;">${address}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #737373; font-size: 13px; vertical-align: top;">Method of Sale</td>
                        <td style="padding: 8px 0; color: #1A1A1A; font-size: 14px;">${method}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #737373; font-size: 13px; vertical-align: top;">Price Guide</td>
                        <td style="padding: 8px 0; color: #1A1A1A; font-size: 14px; font-weight: 500;">${priceMin && priceMax ? fmtPrice(priceMin) + ' — ' + fmtPrice(priceMax) : priceMin ? fmtPrice(priceMin) + '+' : priceMax ? 'Up to ' + fmtPrice(priceMax) : 'TBC'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #737373; font-size: 13px; vertical-align: top;">Commission</td>
                        <td style="padding: 8px 0; color: #1A1A1A; font-size: 14px;">${fmtPercent(commission)}</td>
                      </tr>
                      ${totalAdCost ? `<tr>
                        <td style="padding: 8px 0; color: #737373; font-size: 13px; vertical-align: top;">Marketing Investment</td>
                        <td style="padding: 8px 0; color: #1A1A1A; font-size: 14px; font-weight: 500;">${fmtPrice(totalAdCost)}</td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              ${marketingSummary ? `
              <p style="color: #737373; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 8px 0;">marketing campaign includes</p>
              ${marketingSummary}
              <div style="height: 24px;"></div>
              ` : ''}

              <p style="color: #4A4A4A; font-size: 16px; line-height: 1.7; font-weight: 300; margin: 0 0 24px 0;">
                You can review your full proposal at any time using the link below.
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td>
                    <a href="${url}" target="_blank"
                       style="display: inline-block; background-color: #C41E2A; color: #FFFFFF; text-decoration: none; padding: 16px 32px; font-size: 16px; font-weight: 500; letter-spacing: 0.5px; border-radius: 4px;">
                      view your proposal
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #4A4A4A; font-size: 16px; line-height: 1.7; font-weight: 300; margin: 32px 0 0 0;">
                If you have any questions, don't hesitate to reach out.
              </p>
            </td>
          </tr>

          <!-- Agent contact -->
          <tr>
            <td style="background-color: #1A1A1A; padding: 32px 40px;">
              <p style="color: rgba(255,255,255,0.7); font-size: 15px; font-weight: 400; margin: 0 0 4px 0;">
                ${escapeHtml(agentName)}
              </p>
              <p style="color: rgba(255,255,255,0.4); font-size: 13px; font-weight: 300; margin: 0 0 12px 0;">
                ${proposal.agency?.agentTitle ? escapeHtml(proposal.agency.agentTitle) + ' — ' : ''}${agency.toLowerCase()}
              </p>
              <p style="color: rgba(255,255,255,0.3); font-size: 13px; font-weight: 300; margin: 0 0 4px 0;">
                <a href="tel:${agentPhone.replace(/\s/g, '')}" style="color: rgba(255,255,255,0.4); text-decoration: none;">${escapeHtml(agentPhone)}</a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="mailto:${escapeHtml(agentEmail)}" style="color: rgba(255,255,255,0.4); text-decoration: none;">${escapeHtml(agentEmail)}</a>
              </p>
              ${proposal.agency?.address ? `<p style="color: rgba(255,255,255,0.25); font-size: 12px; font-weight: 300; margin: 8px 0 0 0;">${escapeHtml(proposal.agency.address)}</p>` : ''}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

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

export async function sendApprovalNotification(proposal: Proposal): Promise<{ success: boolean; error?: string }> {
  const agencyEmail = proposal.agency?.contactEmail || process.env.AGENCY_EMAIL
  if (!agencyEmail) {
    console.log('No agency email configured, skipping approval notification')
    return { success: true }
  }

  const agencyName = proposal.agency?.name || "Grant's Estate Agents"
  const proposalUrl = getProposalUrl(proposal.id)

  try {
    const { error } = await getResend().emails.send({
      from: `GEA Proposals <${FROM_EMAIL}>`,
      to: [agencyEmail],
      subject: `Proposal Approved — ${proposal.propertyAddress}`,
      html: buildApprovalNotificationHtml({
        clientName: proposal.clientName,
        clientEmail: proposal.clientEmail,
        propertyAddress: proposal.propertyAddress,
        proposalUrl,
        agencyName,
      }),
    })

    if (error) {
      console.error('Approval notification error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Approval notification error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send notification' }
  }
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

          <!-- Gold accent line -->
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
                       style="display: inline-block; background-color: #C41E2A; color: #1A1A1A; text-decoration: none; padding: 16px 32px; font-size: 16px; font-weight: 500; letter-spacing: 0.5px; border-radius: 4px;">
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

interface ApprovalNotificationData {
  clientName: string
  clientEmail: string
  propertyAddress: string
  proposalUrl: string
  agencyName: string
}

function buildApprovalNotificationHtml(data: ApprovalNotificationData): string {
  const client = escapeHtml(data.clientName)
  const clientEmail = escapeHtml(data.clientEmail)
  const address = escapeHtml(data.propertyAddress)
  const url = escapeHtml(data.proposalUrl)

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

          <!-- Green accent line -->
          <tr>
            <td style="background-color: #9B8B7A; height: 4px; font-size: 0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="background-color: #1A1A1A; padding: 40px;">
              <h1 style="color: #9B8B7A; font-size: 24px; font-weight: 400; margin: 0 0 8px 0; text-transform: lowercase;">
                proposal approved
              </h1>
              <p style="color: rgba(255,255,255,0.5); font-size: 14px; font-weight: 300; margin: 0;">
                ${address.toLowerCase()}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 40px;">
              <p style="color: #4A4A4A; font-size: 16px; line-height: 1.7; font-weight: 300; margin: 0 0 24px 0;">
                <strong>${client}</strong> has approved the proposal for <strong>${address}</strong>.
              </p>

              <table cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0; width: 100%;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #F0F0F0;">
                    <span style="color: #737373; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Client</span><br>
                    <span style="color: #1A1A1A; font-size: 15px;">${client}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #F0F0F0;">
                    <span style="color: #737373; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Email</span><br>
                    <a href="mailto:${clientEmail}" style="color: #C41E2A; text-decoration: none; font-size: 15px;">${clientEmail}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="color: #737373; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Property</span><br>
                    <span style="color: #1A1A1A; font-size: 15px;">${address}</span>
                  </td>
                </tr>
              </table>

              <a href="${url}" target="_blank"
                 style="display: inline-block; background-color: #1A1A1A; color: #FFFFFF; text-decoration: none; padding: 14px 28px; font-size: 14px; font-weight: 500; border-radius: 4px;">
                view proposal
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #F5F5F5;">
              <p style="color: #A3A3A3; font-size: 12px; font-weight: 300; margin: 0;">
                This is an automated notification from your GEA Proposals system.
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

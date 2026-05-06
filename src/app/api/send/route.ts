import { NextRequest, NextResponse } from 'next/server'
import { getProposal, updateProposal } from '@/lib/proposal-generator'
import { sendProposalEmail } from '@/lib/email'
import { createNurturePlan } from '@/lib/nurture'

export async function POST(request: NextRequest) {
  try {
    let proposalId: string | null = null
    let attachments: Array<{ filename: string; content: Buffer }> = []

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      proposalId = formData.get('proposalId') as string | null

      for (const [key, value] of formData.entries()) {
        if (key.startsWith('attachment_') && value instanceof File) {
          const buffer = Buffer.from(await value.arrayBuffer())
          attachments.push({ filename: value.name, content: buffer })
        }
      }
    } else {
      const body = await request.json()
      proposalId = body.proposalId
    }

    if (!proposalId) {
      return NextResponse.json(
        { error: 'Proposal ID required' },
        { status: 400 }
      )
    }

    const proposal = await getProposal(proposalId)
    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      )
    }

    if (!proposal.clientEmail) {
      return NextResponse.json(
        { error: 'No client email address on this proposal' },
        { status: 400 }
      )
    }

    const result = await sendProposalEmail(proposal, attachments.length > 0 ? attachments : undefined)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    await updateProposal(proposalId, {
      status: proposal.status === 'draft' ? 'sent' : proposal.status,
      sentAt: proposal.sentAt || new Date().toISOString(),
    })

    try {
      createNurturePlan(proposalId)
    } catch (nurtureErr) {
      console.error('Failed to create nurture plan:', nurtureErr instanceof Error ? nurtureErr.message : nurtureErr)
    }

    return NextResponse.json({
      success: true,
      message: `Proposal sent to ${proposal.clientEmail}`,
    })
  } catch (error) {
    console.error('Error sending proposal:', error)
    return NextResponse.json(
      { error: 'Failed to send proposal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

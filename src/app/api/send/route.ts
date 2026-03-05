import { NextRequest, NextResponse } from 'next/server'
import { getProposal, updateProposal } from '@/lib/proposal-generator'
import { sendProposalEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { proposalId } = body

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

    // Send the email
    const result = await sendProposalEmail(proposal)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    // Update proposal status
    await updateProposal(proposalId, {
      status: proposal.status === 'draft' ? 'sent' : proposal.status,
      sentAt: proposal.sentAt || new Date().toISOString(),
    })

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

import { NextRequest, NextResponse } from 'next/server'
import { updateProposalStatus, getProposal } from '@/lib/proposal-generator'
import { sendApprovalNotification } from '@/lib/email'

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

    if (proposal.status === 'approved') {
      return NextResponse.json({
        success: true,
        message: 'Proposal already approved',
        proposal,
      })
    }

    const updatedProposal = await updateProposalStatus(proposalId, 'approved')

    // Send notification to agency (non-blocking, don't fail the approval)
    sendApprovalNotification({ ...proposal, status: 'approved' }).then((result) => {
      if (result.success) {
        console.log(`Approval notification sent for proposal ${proposalId}`)
      } else {
        console.warn(`Failed to send approval notification: ${result.error}`)
      }
    }).catch((err) => {
      console.warn('Approval notification error:', err)
    })

    return NextResponse.json({
      success: true,
      message: 'Proposal approved successfully',
      proposal: updatedProposal,
    })
  } catch (error) {
    console.error('Error approving proposal:', error)
    return NextResponse.json(
      { error: 'Failed to approve proposal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

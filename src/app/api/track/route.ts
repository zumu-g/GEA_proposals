import { NextRequest, NextResponse } from 'next/server'
import { getProposal, updateProposal } from '@/lib/proposal-generator'

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

    // Only record first view
    if (!proposal.viewedAt) {
      await updateProposal(proposalId, {
        viewedAt: new Date().toISOString(),
        status: proposal.status === 'sent' || proposal.status === 'draft' ? 'viewed' : proposal.status,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking view:', error)
    return NextResponse.json(
      { error: 'Failed to track view' },
      { status: 500 }
    )
  }
}

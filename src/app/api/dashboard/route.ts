import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

interface ProposalRow {
  id: string
  client_name: string
  client_email: string
  property_address: string
  proposal_date: string
  price_guide_min: number | null
  price_guide_max: number | null
  method_of_sale: string | null
  status: string
  sent_at: string | null
  viewed_at: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

interface ActivityRow {
  id: number
  proposal_id: string
  type: string
  description: string | null
  metadata: string | null
  created_at: string
}

export interface DashboardProposal {
  id: string
  clientName: string
  clientEmail: string
  propertyAddress: string
  proposalDate: string
  priceGuide: { min: number; max: number } | null
  methodOfSale: string | null
  status: string
  sentAt: string | null
  viewedAt: string | null
  approvedAt: string | null
  createdAt: string
  updatedAt: string
  daysInStage: number
  lastActivityDate: string | null
  activityCount: number
}

function computeDaysInStage(row: ProposalRow): number {
  // Use the most recent status-change timestamp
  let stageStart: string
  switch (row.status) {
    case 'approved':
      stageStart = row.approved_at || row.updated_at
      break
    case 'viewed':
      stageStart = row.viewed_at || row.updated_at
      break
    case 'sent':
      stageStart = row.sent_at || row.updated_at
      break
    default:
      stageStart = row.created_at
  }
  const start = new Date(stageStart)
  const now = new Date()
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

export async function GET() {
  try {
    const db = getDb()

    const proposals = db
      .prepare(
        `SELECT id, client_name, client_email, property_address, proposal_date,
                price_guide_min, price_guide_max, method_of_sale, status,
                sent_at, viewed_at, approved_at, created_at, updated_at
         FROM proposals ORDER BY updated_at DESC`
      )
      .all() as ProposalRow[]

    // Get activity counts and last activity per proposal in one query
    const activityStats = db
      .prepare(
        `SELECT proposal_id,
                COUNT(*) as count,
                MAX(created_at) as last_activity
         FROM activities GROUP BY proposal_id`
      )
      .all() as { proposal_id: string; count: number; last_activity: string }[]

    const activityMap = new Map(
      activityStats.map((a) => [a.proposal_id, { count: a.count, lastActivity: a.last_activity }])
    )

    const dashboardProposals: DashboardProposal[] = proposals.map((row) => {
      const stats = activityMap.get(row.id)
      return {
        id: row.id,
        clientName: row.client_name,
        clientEmail: row.client_email,
        propertyAddress: row.property_address,
        proposalDate: row.proposal_date,
        priceGuide:
          row.price_guide_min != null && row.price_guide_max != null
            ? { min: row.price_guide_min, max: row.price_guide_max }
            : null,
        methodOfSale: row.method_of_sale,
        status: row.status,
        sentAt: row.sent_at,
        viewedAt: row.viewed_at,
        approvedAt: row.approved_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        daysInStage: computeDaysInStage(row),
        lastActivityDate: stats?.lastActivity || null,
        activityCount: stats?.count || 0,
      }
    })

    // Group by status
    const grouped: Record<string, DashboardProposal[]> = {
      draft: [],
      sent: [],
      viewed: [],
      approved: [],
      rejected: [],
    }
    for (const p of dashboardProposals) {
      if (grouped[p.status]) {
        grouped[p.status].push(p)
      }
    }

    // Summary stats
    const summary = {
      total: dashboardProposals.length,
      draft: grouped.draft.length,
      sent: grouped.sent.length,
      viewed: grouped.viewed.length,
      approved: grouped.approved.length,
      rejected: grouped.rejected.length,
      awaitingResponse: grouped.sent.length,
      hotLeads: grouped.viewed.length,
      recentlyCreated: dashboardProposals.filter((p) => {
        const created = new Date(p.createdAt)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return created >= weekAgo
      }).length,
    }

    return NextResponse.json({
      proposals: dashboardProposals,
      grouped,
      summary,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load dashboard data' },
      { status: 500 }
    )
  }
}

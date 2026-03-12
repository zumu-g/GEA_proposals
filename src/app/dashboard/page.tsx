import { getDb } from '@/lib/db'
import { PipelineBoard } from '@/components/Dashboard/PipelineBoard'
import type { DashboardProposal } from '@/components/Dashboard/ProposalCard'
import type { DashboardSummary } from '@/components/Dashboard/StatsOverview'

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

function computeDaysInStage(row: ProposalRow): number {
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

function getDashboardData() {
  const db = getDb()

  const proposals = db
    .prepare(
      `SELECT id, client_name, client_email, property_address, proposal_date,
              price_guide_min, price_guide_max, method_of_sale, status,
              sent_at, viewed_at, approved_at, created_at, updated_at
       FROM proposals ORDER BY updated_at DESC`
    )
    .all() as ProposalRow[]

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

  const summary: DashboardSummary = {
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

  return { proposals: dashboardProposals, grouped, summary }
}

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const { proposals, grouped, summary } = getDashboardData()

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Top accent bar */}
      <div className="w-full h-0.5 bg-gradient-to-r from-gold/0 via-gold to-gold/0" />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 py-10 sm:py-14">
        {/* Header */}
        <header className="mb-10">
          <p className="text-gold/70 font-sans text-[10px] tracking-wider-custom uppercase mb-3">
            grant estate agents
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-normal text-white lowercase leading-tight">
                proposal pipeline
              </h1>
              <div className="w-12 h-px bg-sage/40 mt-4" />
            </div>
          </div>
        </header>

        {/* Pipeline board */}
        <PipelineBoard
          initialProposals={proposals}
          initialGrouped={grouped}
          initialSummary={summary}
        />
      </div>
    </div>
  )
}

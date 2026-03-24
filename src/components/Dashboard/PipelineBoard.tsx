'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { StatsOverview, DashboardSummary } from './StatsOverview'
import { ProposalCard, DashboardProposal } from './ProposalCard'
import { NotificationsPanel } from './NotificationsPanel'

type ViewMode = 'board' | 'list'

interface StageConfig {
  key: string
  label: string
  color: string
  dotColor: string
  borderColor: string
  bgColor: string
}

const STAGES: StageConfig[] = [
  {
    key: 'draft',
    label: 'draft',
    color: 'text-charcoal-300',
    dotColor: 'bg-charcoal-400',
    borderColor: 'border-charcoal-500/30',
    bgColor: 'bg-charcoal-700/30',
  },
  {
    key: 'sent',
    label: 'sent',
    color: 'text-[#C41E2A]/70',
    dotColor: 'bg-[#C41E2A]',
    borderColor: 'border-[#C41E2A]/20',
    bgColor: 'bg-[#C41E2A]/[0.04]',
  },
  {
    key: 'viewed',
    label: 'viewed',
    color: 'text-sage-300',
    dotColor: 'bg-sage',
    borderColor: 'border-sage/20',
    bgColor: 'bg-sage/[0.04]',
  },
  {
    key: 'approved',
    label: 'approved',
    color: 'text-forest-300',
    dotColor: 'bg-forest-400',
    borderColor: 'border-forest-400/20',
    bgColor: 'bg-forest-400/[0.04]',
  },
  {
    key: 'rejected',
    label: 'lost',
    color: 'text-red-400/70',
    dotColor: 'bg-red-400',
    borderColor: 'border-red-400/10',
    bgColor: 'bg-red-400/[0.02]',
  },
]

interface PipelineBoardProps {
  initialProposals: DashboardProposal[]
  initialGrouped: Record<string, DashboardProposal[]>
  initialSummary: DashboardSummary
}

export function PipelineBoard({
  initialProposals,
  initialGrouped,
  initialSummary,
}: PipelineBoardProps) {
  const prefersReducedMotion = useReducedMotion()
  const [proposals, setProposals] = useState(initialProposals)
  const [grouped, setGrouped] = useState(initialGrouped)
  const [summary, setSummary] = useState(initialSummary)
  const [viewMode, setViewMode] = useState<ViewMode>('board')
  const [pollLoading, setPollLoading] = useState(false)
  const [pollResult, setPollResult] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [highlightedProposalId, setHighlightedProposalId] = useState<string | null>(null)
  const pollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear poll result after 4s
  useEffect(() => {
    if (pollResult) {
      pollTimeout.current = setTimeout(() => setPollResult(null), 4000)
      return () => {
        if (pollTimeout.current) clearTimeout(pollTimeout.current)
      }
    }
  }, [pollResult])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/dashboard')
      if (res.ok) {
        const data = await res.json()
        setProposals(data.proposals)
        setGrouped(data.grouped)
        setSummary(data.summary)
      }
    } catch {
      // Fail silently -- data stays stale
    } finally {
      setRefreshing(false)
    }
  }, [])

  const handlePoll = async () => {
    if (pollLoading) return
    setPollLoading(true)
    setPollResult(null)
    try {
      const res = await fetch('/api/poll-inbox', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setPollResult(
          data.processed > 0
            ? `${data.processed} new proposal${data.processed > 1 ? 's' : ''} imported`
            : 'no new proposals found'
        )
        if (data.processed > 0) {
          await refresh()
        }
      } else {
        setPollResult('failed to check inbox')
      }
    } catch {
      setPollResult('failed to check inbox')
    } finally {
      setPollLoading(false)
    }
  }

  const handleNavigateToProposal = useCallback((proposalId: string) => {
    setHighlightedProposalId(proposalId)
    // Find which stage the proposal is in and scroll to it
    const el = document.getElementById(`proposal-${proposalId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    // Clear highlight after 3s
    setTimeout(() => setHighlightedProposalId(null), 3000)
  }, [])

  // Compute quick stats
  const callsDueToday = proposals.filter(p => {
    // Proposals that are sent/viewed and stale (3+ days without activity)
    if (p.status === 'sent' && p.daysInStage >= 3) return true
    return false
  }).length

  const emailsPending = proposals.filter(p => p.status === 'draft').length
  const needsAttention = proposals.filter(p => {
    if (p.status === 'sent' && p.daysInStage >= 5) return true
    if (p.status === 'viewed' && p.daysInStage >= 1) return true
    return false
  }).length

  return (
    <div className="space-y-8">
      {/* Header with notifications */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-display text-2xl">pipeline</h1>
          <p className="text-white/40 font-sans text-sm mt-1">manage proposals and track activity</p>
        </div>
        <NotificationsPanel onNavigateToProposal={handleNavigateToProposal} />
      </div>

      {/* Quick stats row */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="grid grid-cols-3 gap-3"
      >
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/50 text-lg">
            {summary.total}
          </div>
          <div>
            <p className="text-white/50 font-sans text-[10px] tracking-wider-custom uppercase">total proposals</p>
            <p className="text-white font-sans text-sm font-medium">{summary.total} active</p>
          </div>
        </div>

        <div className={`bg-white/[0.04] border rounded-xl p-4 flex items-center gap-3 ${needsAttention > 0 ? 'border-[#C41E2A]/30' : 'border-white/[0.08]'}`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${needsAttention > 0 ? 'bg-[#C41E2A]/10 text-[#C41E2A]' : 'bg-white/[0.06] text-white/50'}`}>
            {needsAttention}
          </div>
          <div>
            <p className="text-white/50 font-sans text-[10px] tracking-wider-custom uppercase">needs attention</p>
            <p className={`font-sans text-sm font-medium ${needsAttention > 0 ? 'text-[#C41E2A]' : 'text-white/40'}`}>
              {needsAttention > 0 ? `${needsAttention} follow-up${needsAttention !== 1 ? 's' : ''} due` : 'all clear'}
            </p>
          </div>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${emailsPending > 0 ? 'bg-charcoal-600 text-white/60' : 'bg-white/[0.06] text-white/50'}`}>
            {emailsPending}
          </div>
          <div>
            <p className="text-white/50 font-sans text-[10px] tracking-wider-custom uppercase">drafts pending</p>
            <p className="text-white/60 font-sans text-sm font-medium">
              {emailsPending > 0 ? `${emailsPending} to review` : 'none pending'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats overview */}
      <StatsOverview summary={summary} />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1.5 rounded-md font-sans text-xs font-medium transition-colors ${
                viewMode === 'board'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md font-sans text-xs font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              list
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={refresh}
            disabled={refreshing}
            className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white/40 hover:text-white/60 font-sans text-xs transition-colors disabled:opacity-50 min-h-[36px] active:scale-[0.97]"
          >
            {refreshing ? 'refreshing...' : 'refresh'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Poll result */}
          <AnimatePresence>
            {pollResult && (
              <motion.span
                initial={prefersReducedMotion ? false : { opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                className="text-white/40 font-sans text-xs"
              >
                {pollResult}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Poll inbox */}
          <button
            onClick={handlePoll}
            disabled={pollLoading}
            className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white/50 hover:text-white/70 hover:border-white/[0.15] font-sans text-xs font-medium transition-colors disabled:opacity-50 min-h-[36px] active:scale-[0.97]"
          >
            {pollLoading ? 'checking...' : 'poll inbox'}
          </button>

          {/* New proposal */}
          <a
            href="mailto:newproposal@agentmail.to?subject=New%20Proposal&body=Client%20Name%3A%20%0AClient%20Email%3A%20%0AProperty%20Address%3A%20%0APrice%20Guide%3A%20%0AMethod%20of%20Sale%3A%20"
            className="px-4 py-2 bg-[#C41E2A] hover:bg-[#C41E2A]/90 text-white rounded-lg font-sans text-xs font-medium transition-colors min-h-[36px] inline-flex items-center active:scale-[0.97]"
          >
            + new proposal
          </a>
        </div>
      </div>

      {/* Board view */}
      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {STAGES.map((stage) => {
            const stageProposals = grouped[stage.key] || []
            return (
              <motion.div
                key={stage.key}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={`${stage.bgColor} border ${stage.borderColor} rounded-xl p-3 min-h-[200px]`}
              >
                {/* Column header */}
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${stage.dotColor}`} />
                    <h3 className={`font-sans text-xs font-medium tracking-wider-custom uppercase ${stage.color}`}>
                      {stage.label}
                    </h3>
                  </div>
                  <span className="text-white/30 font-sans text-xs font-medium bg-white/[0.06] px-2 py-0.5 rounded-full">
                    {stageProposals.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  <AnimatePresence>
                    {stageProposals.length === 0 ? (
                      <p className="text-white/20 font-sans text-xs text-center py-8">
                        no proposals
                      </p>
                    ) : (
                      stageProposals.map((proposal, index) => (
                        <ProposalCard
                          key={proposal.id}
                          proposal={proposal}
                          index={index}
                          highlighted={highlightedProposalId === proposal.id}
                          onActivityLogged={refresh}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        /* List view */
        <div className="space-y-6">
          {STAGES.map((stage) => {
            const stageProposals = grouped[stage.key] || []
            if (stageProposals.length === 0) return null

            return (
              <div key={stage.key}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${stage.dotColor}`} />
                  <h3 className={`font-sans text-xs font-medium tracking-wider-custom uppercase ${stage.color}`}>
                    {stage.label}
                  </h3>
                  <span className="text-white/30 font-sans text-xs">
                    ({stageProposals.length})
                  </span>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {stageProposals.map((proposal, index) => (
                      <ProposalCard
                        key={proposal.id}
                        proposal={proposal}
                        index={index}
                        highlighted={highlightedProposalId === proposal.id}
                        onActivityLogged={refresh}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )
          })}

          {proposals.length === 0 && (
            <div className="text-center py-16">
              <p className="text-white/30 font-sans text-base font-light">
                no proposals yet
              </p>
              <p className="text-white/20 font-sans text-sm mt-2">
                email{' '}
                <a
                  href="mailto:newproposal@agentmail.to"
                  className="text-[#C41E2A]/60 hover:text-[#C41E2A] transition-colors"
                >
                  newproposal@agentmail.to
                </a>{' '}
                or poll the inbox to get started
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

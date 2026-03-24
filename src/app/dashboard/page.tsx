'use client'

import { useState, useEffect } from 'react'
import { PipelineBoard } from '@/components/Dashboard/PipelineBoard'
import type { DashboardProposal } from '@/components/Dashboard/ProposalCard'
import type { DashboardSummary } from '@/components/Dashboard/StatsOverview'
import Link from 'next/link'

interface DashboardData {
  proposals: DashboardProposal[]
  grouped: Record<string, DashboardProposal[]>
  summary: DashboardSummary
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/dashboard')
        if (!res.ok) throw new Error('Failed to load dashboard')
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      }
    }
    load()
  }, [])

  if (error) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/50 font-sans text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white/60 hover:text-white font-sans text-sm transition-colors"
          >
            retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-charcoal">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Back link */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-white/40 hover:text-white/70 font-sans text-sm transition-colors inline-flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            back to proposals
          </Link>
        </div>

        <PipelineBoard
          initialProposals={data.proposals}
          initialGrouped={data.grouped}
          initialSummary={data.summary}
        />
      </div>
    </div>
  )
}

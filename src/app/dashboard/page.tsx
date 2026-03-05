'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Proposal } from '@/types/proposal'

type StatusFilter = 'all' | Proposal['status']

const STATUS_LABELS: Record<Proposal['status'], string> = {
  draft: 'draft',
  sent: 'sent',
  viewed: 'viewed',
  approved: 'approved',
  rejected: 'rejected',
}

const STATUS_COLORS: Record<Proposal['status'], string> = {
  draft: 'bg-white/10 text-white/50',
  sent: 'bg-gold/20 text-gold',
  viewed: 'bg-gold/10 text-gold-300',
  approved: 'bg-sage/20 text-sage-300',
  rejected: 'bg-white/10 text-white/40',
}

function formatDate(dateString: string): string {
  if (!dateString) return ''
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(dateString: string): string {
  if (!dateString) return ''
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DashboardPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [actionError, setActionError] = useState<{ id: string; message: string } | null>(null)
  const hasLoaded = useRef(false)

  const addLoading = (id: string) => setActionLoading(prev => new Set(prev).add(id))
  const removeLoading = (id: string) => setActionLoading(prev => { const s = new Set(prev); s.delete(id); return s })

  const fetchProposals = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/proposals')
      if (!res.ok) throw new Error('Failed to load proposals')
      const data = await res.json()
      setProposals(data.proposals || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposals')
    } finally {
      setLoading(false)
      hasLoaded.current = true
    }
  }, [])

  useEffect(() => {
    fetchProposals()
  }, [fetchProposals])

  const filteredProposals = filter === 'all'
    ? proposals
    : proposals.filter(p => p.status === filter)

  const stats = {
    total: proposals.length,
    draft: proposals.filter(p => p.status === 'draft').length,
    sent: proposals.filter(p => p.status === 'sent').length,
    viewed: proposals.filter(p => p.status === 'viewed').length,
    approved: proposals.filter(p => p.status === 'approved').length,
  }

  const handleFilterChange = (status: StatusFilter) => {
    setFilter(status)
    setDeleteConfirm(null)
    setActionError(null)
  }

  const handleResend = async (proposalId: string) => {
    if (actionLoading.has(proposalId)) return
    addLoading(proposalId)
    setActionError(null)
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setActionError({ id: proposalId, message: data.error || 'Failed to send' })
      } else {
        setProposals(prev => prev.map(p =>
          p.id === proposalId ? { ...p, status: p.status === 'draft' ? 'sent' as const : p.status, sentAt: p.sentAt || new Date().toISOString() } : p
        ))
      }
    } catch {
      setActionError({ id: proposalId, message: 'Failed to send email' })
    } finally {
      removeLoading(proposalId)
    }
  }

  const handleDelete = async (proposalId: string) => {
    if (actionLoading.has(proposalId)) return
    addLoading(proposalId)
    setActionError(null)
    try {
      const res = await fetch(`/api/proposals?id=${proposalId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setProposals(prev => prev.filter(p => p.id !== proposalId))
        setDeleteConfirm(null)
      } else {
        setActionError({ id: proposalId, message: 'Failed to delete proposal' })
      }
    } catch {
      setActionError({ id: proposalId, message: 'Failed to delete proposal' })
    } finally {
      removeLoading(proposalId)
    }
  }

  return (
    <div className="min-h-screen bg-charcoal">
      <div className="w-full h-1 bg-gold" />

      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 gap-4">
            <div>
              <p className="text-gold font-sans text-sm tracking-wider-custom mb-4">
                grant estate agents
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-normal text-white lowercase">
                proposals
              </h1>
              <div className="gold-accent-line mt-4" />
            </div>
            <Link
              href="/"
              className="inline-flex items-center px-5 py-3 bg-gold text-charcoal rounded font-sans text-sm font-medium hover:bg-gold-600 transition-colors min-h-[44px]"
            >
              + new proposal
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-12">
            {[
              { label: 'total', value: stats.total, accent: 'border-white/10' },
              { label: 'draft', value: stats.draft, accent: 'border-white/5' },
              { label: 'sent', value: stats.sent, accent: 'border-gold/30' },
              { label: 'viewed', value: stats.viewed, accent: 'border-gold/10' },
              { label: 'approved', value: stats.approved, accent: 'border-sage/30' },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`bg-white/5 border ${stat.accent} rounded-lg p-4`}
              >
                <p className="text-white/40 font-sans text-xs tracking-wider-custom mb-1">
                  {stat.label}
                </p>
                <p className="text-white font-display text-2xl">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-10" role="tablist">
            {(['all', 'draft', 'sent', 'viewed', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                role="tab"
                aria-selected={filter === status}
                onClick={() => handleFilterChange(status)}
                className={`px-4 py-2 rounded font-sans text-sm transition-colors ${
                  filter === status
                    ? 'bg-gold text-charcoal font-medium'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                }`}
              >
                {status}
                {status !== 'all' && (
                  <span className="ml-1.5 text-xs opacity-60">
                    {proposals.filter(p => p.status === status).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 p-5 bg-white/5 border border-white/10 rounded-lg">
              <p className="font-sans font-medium text-white/60 mb-2">{error}</p>
              <button
                onClick={() => { setLoading(true); fetchProposals() }}
                className="text-sm font-sans text-gold hover:text-gold-300 transition-colors underline"
              >
                try again
              </button>
            </div>
          )}

          {/* Proposal List */}
          {loading ? (
            <div className="text-left py-20">
              <div className="inline-block w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
              <p className="text-white/30 font-sans text-sm mt-4">loading proposals...</p>
            </div>
          ) : !error && filteredProposals.length === 0 ? (
            <div className="text-left py-20 bg-white/5 border border-white/10 rounded-lg px-6">
              <p className="text-white/30 font-sans text-lg font-light mb-2">
                {filter === 'all' ? 'no proposals yet' : `no ${filter} proposals`}
              </p>
              {filter === 'all' && (
                <Link
                  href="/"
                  className="text-gold font-sans text-sm hover:text-gold-300 transition-colors"
                >
                  create your first proposal
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredProposals.map((proposal, index) => (
                  <motion.div
                    key={proposal.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: hasLoaded.current ? 0 : index * 0.03 }}
                    className="bg-white/5 border border-white/10 rounded-lg p-5 hover:bg-white/[0.07] transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                          <h3 className="text-white font-sans font-medium text-base truncate">
                            {proposal.propertyAddress}
                          </h3>
                          <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-sans font-medium ${STATUS_COLORS[proposal.status]}`}>
                            {STATUS_LABELS[proposal.status]}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-sans text-white/40">
                          <span>{proposal.clientName}</span>
                          <span className="text-white/20">{proposal.clientEmail}</span>
                          <span>{formatDate(proposal.proposalDate)}</span>
                          {proposal.sentAt && (
                            <span className="text-gold/50">sent {formatDate(proposal.sentAt)}</span>
                          )}
                          {proposal.viewedAt && (
                            <span className="text-gold/50">viewed {formatDate(proposal.viewedAt)} {formatTime(proposal.viewedAt)}</span>
                          )}
                          {proposal.approvedAt && (
                            <span className="text-sage/60">approved {formatDate(proposal.approvedAt)}</span>
                          )}
                        </div>

                        {/* Inline action error */}
                        {actionError?.id === proposal.id && (
                          <p className="text-white/50 text-xs font-sans mt-2">{actionError.message}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`/proposal/${proposal.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`View proposal for ${proposal.propertyAddress}`}
                          className="px-3 py-2 bg-white/5 border border-white/10 rounded text-white/60 hover:text-white hover:bg-white/10 font-sans text-xs font-medium transition-colors min-h-[44px] flex items-center"
                        >
                          view
                        </a>
                        <button
                          onClick={() => handleResend(proposal.id)}
                          disabled={actionLoading.has(proposal.id)}
                          aria-label={`Send proposal for ${proposal.propertyAddress}`}
                          className="px-3 py-2 bg-white/5 border border-white/10 rounded text-white/60 hover:text-gold hover:border-gold/30 font-sans text-xs font-medium transition-colors disabled:opacity-50 min-h-[44px]"
                        >
                          {actionLoading.has(proposal.id) ? '...' : 'send'}
                        </button>

                        {deleteConfirm === proposal.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDelete(proposal.id)}
                              disabled={actionLoading.has(proposal.id)}
                              className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white/70 font-sans text-xs font-medium hover:bg-white/15 transition-colors disabled:opacity-50 min-h-[44px]"
                            >
                              confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-3 py-2 bg-white/5 border border-white/10 rounded text-white/40 font-sans text-xs font-medium hover:text-white/60 transition-colors min-h-[44px]"
                            >
                              cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(proposal.id)}
                            aria-label={`Delete proposal for ${proposal.propertyAddress}`}
                            className="px-3 py-2 bg-white/5 border border-white/10 rounded text-white/30 hover:text-white/60 hover:border-white/20 font-sans text-xs font-medium transition-colors min-h-[44px]"
                          >
                            delete
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

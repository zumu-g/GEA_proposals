'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ActivityLog, Activity } from './ActivityLog'

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

const STATUS_DOT_COLORS: Record<string, string> = {
  draft: 'bg-charcoal-400',
  sent: 'bg-[#C41E2A]',
  viewed: 'bg-sage',
  approved: 'bg-forest-400',
  rejected: 'bg-red-400',
}

const METHOD_BADGES: Record<string, string> = {
  auction: 'bg-[#C41E2A]/10 text-[#C41E2A] border-[#C41E2A]/20',
  private: 'bg-sage/10 text-sage border-sage/20',
  'private sale': 'bg-sage/10 text-sage border-sage/20',
  'private treaty': 'bg-sage/10 text-sage border-sage/20',
  eoi: 'bg-forest-400/10 text-forest-300 border-forest-400/20',
  'expression of interest': 'bg-forest-400/10 text-forest-300 border-forest-400/20',
}

function formatAud(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return ''
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 30) return `${diffDays}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function getNeedsAttention(proposal: DashboardProposal): { urgent: boolean; label: string } | null {
  // Stale sent proposals (5+ days, no response)
  if (proposal.status === 'sent' && proposal.daysInStage >= 5) {
    return { urgent: true, label: 'follow up overdue' }
  }
  // Sent 3+ days
  if (proposal.status === 'sent' && proposal.daysInStage >= 3) {
    return { urgent: false, label: 'follow up due' }
  }
  // Viewed but not acted on
  if (proposal.status === 'viewed' && proposal.daysInStage >= 1) {
    return { urgent: false, label: 'viewed — call now' }
  }
  return null
}

interface ProposalCardProps {
  proposal: DashboardProposal
  index: number
  highlighted?: boolean
  onActivityLogged?: () => void
}

export function ProposalCard({ proposal, index, highlighted, onActivityLogged }: ProposalCardProps) {
  const prefersReducedMotion = useReducedMotion()
  const [expanded, setExpanded] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [activitiesLoaded, setActivitiesLoaded] = useState(false)
  const [showCallModal, setShowCallModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [callNotes, setCallNotes] = useState('')
  const [noteText, setNoteText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)

  const attention = getNeedsAttention(proposal)

  const loadActivities = useCallback(async () => {
    if (activitiesLoaded) return
    setActivitiesLoading(true)
    try {
      const res = await fetch(`/api/activity?proposalId=${proposal.id}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities || [])
      }
    } catch {
      // Silently fail -- activities are supplementary
    } finally {
      setActivitiesLoading(false)
      setActivitiesLoaded(true)
    }
  }, [proposal.id, activitiesLoaded])

  const handleToggle = () => {
    const next = !expanded
    setExpanded(next)
    if (next && !activitiesLoaded) {
      loadActivities()
    }
  }

  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: proposal.id,
          type: 'call_logged',
          description: callNotes || `Call with ${proposal.clientName}`,
          metadata: { clientName: proposal.clientName, timestamp: new Date().toISOString() },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setActivities(prev => [data.activity, ...prev])
        setCallNotes('')
        setShowCallModal(false)
        setActionFeedback('call logged')
        setTimeout(() => setActionFeedback(null), 3000)
        onActivityLogged?.()
      }
    } catch {
      setActionFeedback('failed to log call')
      setTimeout(() => setActionFeedback(null), 3000)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || !noteText.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: proposal.id,
          type: 'note_added',
          description: noteText.trim(),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setActivities(prev => [data.activity, ...prev])
        setNoteText('')
        setShowNoteModal(false)
        setActionFeedback('note added')
        setTimeout(() => setActionFeedback(null), 3000)
        onActivityLogged?.()
      }
    } catch {
      setActionFeedback('failed to add note')
      setTimeout(() => setActionFeedback(null), 3000)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `${window.location.origin}/proposal/${proposal.id}`
    navigator.clipboard.writeText(url).then(() => {
      setActionFeedback('link copied')
      setTimeout(() => setActionFeedback(null), 2000)
    }).catch(() => {
      setActionFeedback('copy failed')
      setTimeout(() => setActionFeedback(null), 2000)
    })
  }

  const methodBadgeClass =
    proposal.methodOfSale
      ? METHOD_BADGES[proposal.methodOfSale.toLowerCase()] || 'bg-white/5 text-white/50 border-white/10'
      : null

  return (
    <motion.div
      layout
      id={`proposal-${proposal.id}`}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.98 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: 'easeOut' }}
      className="group"
    >
      <div
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleToggle()
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        className={`bg-white/[0.04] border rounded-xl p-4 cursor-pointer transition-all duration-200 hover:bg-white/[0.07] hover:shadow-lg hover:shadow-black/20 hover:scale-[1.01] active:scale-[0.99] ${
          expanded ? 'bg-white/[0.06] border-white/[0.12]' : 'border-white/[0.08]'
        } ${
          highlighted ? 'ring-2 ring-[#C41E2A]/50 border-[#C41E2A]/30' : ''
        } ${
          attention?.urgent ? 'border-[#C41E2A]/30' : ''
        }`}
      >
        {/* Attention badge */}
        {attention && (
          <div className={`flex items-center gap-1.5 mb-2 ${attention.urgent ? 'text-[#C41E2A]' : 'text-[#C41E2A]/60'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${attention.urgent ? 'bg-[#C41E2A] animate-pulse' : 'bg-[#C41E2A]/50'}`} />
            <span className="font-sans text-[10px] font-medium uppercase tracking-wider-custom">
              {attention.label}
            </span>
          </div>
        )}

        {/* Main row */}
        <div className="flex items-start gap-3">
          {/* Status dot */}
          <div className="pt-1.5 shrink-0">
            <div
              className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT_COLORS[proposal.status] || 'bg-white/30'}`}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-sans font-medium text-sm leading-snug truncate">
              {proposal.propertyAddress}
            </h3>

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-white/60 font-sans text-xs">
                {proposal.clientName}
              </span>

              {proposal.priceGuide && (
                <span className="text-white/40 font-sans text-xs">
                  {formatAud(proposal.priceGuide.min)}&ndash;{formatAud(proposal.priceGuide.max)}
                </span>
              )}

              {proposal.methodOfSale && methodBadgeClass && (
                <span
                  className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-sans font-medium border ${methodBadgeClass}`}
                >
                  {proposal.methodOfSale.toLowerCase()}
                </span>
              )}
            </div>
          </div>

          {/* Meta info - right side */}
          <div className="text-right shrink-0 space-y-1">
            {proposal.daysInStage > 0 && (
              <p className={`font-sans text-[10px] ${proposal.daysInStage >= 5 && proposal.status === 'sent' ? 'text-[#C41E2A]/70' : 'text-white/30'}`}>
                {proposal.daysInStage}d in stage
              </p>
            )}
            {proposal.lastActivityDate && (
              <p className="text-white/30 font-sans text-[10px]">
                {formatRelativeTime(proposal.lastActivityDate)}
              </p>
            )}
          </div>
        </div>

        {/* Action feedback */}
        <AnimatePresence>
          {actionFeedback && (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              className="mt-2 text-sage font-sans text-[10px] font-medium"
            >
              {actionFeedback}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expanded detail panel */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-3 border-t border-white/[0.08]">
                {/* Quick details row */}
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-sans mb-3">
                  <span className="text-white/40">
                    {proposal.clientEmail}
                  </span>
                  {proposal.sentAt && (
                    <span className="text-[#C41E2A]/60">
                      sent {formatRelativeTime(proposal.sentAt)}
                    </span>
                  )}
                  {proposal.viewedAt && (
                    <span className="text-sage/60">
                      viewed {formatRelativeTime(proposal.viewedAt)}
                    </span>
                  )}
                  {proposal.approvedAt && (
                    <span className="text-forest-300/80">
                      approved {formatRelativeTime(proposal.approvedAt)}
                    </span>
                  )}
                </div>

                {/* Activity log */}
                <ActivityLog activities={activities} loading={activitiesLoading} />

                {/* Log call modal */}
                <AnimatePresence>
                  {showCallModal && (
                    <motion.form
                      initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleLogCall}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 p-3 bg-white/[0.03] border border-white/[0.08] rounded-lg space-y-2"
                    >
                      <p className="text-white/60 font-sans text-[10px] uppercase tracking-wider-custom">log call</p>
                      <textarea
                        value={callNotes}
                        onChange={(e) => setCallNotes(e.target.value)}
                        placeholder={`Notes from call with ${proposal.clientName}...`}
                        className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-white font-sans text-xs placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#C41E2A]/30 focus:border-[#C41E2A]/20 transition-all resize-none"
                        rows={2}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-3 py-1.5 bg-[#C41E2A]/80 hover:bg-[#C41E2A] text-white rounded-lg font-sans text-xs font-medium transition-colors disabled:opacity-50 active:scale-[0.97]"
                        >
                          {submitting ? 'saving...' : 'save call'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setShowCallModal(false) }}
                          className="px-3 py-1.5 text-white/40 hover:text-white/60 font-sans text-xs transition-colors"
                        >
                          cancel
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Add note modal */}
                <AnimatePresence>
                  {showNoteModal && (
                    <motion.form
                      initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleAddNote}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 p-3 bg-white/[0.03] border border-white/[0.08] rounded-lg space-y-2"
                    >
                      <p className="text-white/60 font-sans text-[10px] uppercase tracking-wider-custom">add note</p>
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Add a note about this proposal..."
                        className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-white font-sans text-xs placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#C41E2A]/30 focus:border-[#C41E2A]/20 transition-all resize-none"
                        rows={2}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={submitting || !noteText.trim()}
                          className="px-3 py-1.5 bg-sage/60 hover:bg-sage/80 text-white rounded-lg font-sans text-xs font-medium transition-colors disabled:opacity-50 active:scale-[0.97]"
                        >
                          {submitting ? 'saving...' : 'save note'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setShowNoteModal(false) }}
                          className="px-3 py-1.5 text-white/40 hover:text-white/60 font-sans text-xs transition-colors"
                        >
                          cancel
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.06] flex-wrap">
                  <a
                    href={`/edit/${proposal.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-2 bg-[#C41E2A]/10 border border-[#C41E2A]/20 rounded-lg text-[#C41E2A]/80 hover:text-[#C41E2A] hover:bg-[#C41E2A]/15 font-sans text-xs font-medium transition-colors min-h-[36px] flex items-center gap-1.5 active:scale-[0.97]"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    edit
                  </a>
                  <a
                    href={`/proposal/${proposal.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 font-sans text-xs font-medium transition-colors min-h-[36px] flex items-center active:scale-[0.97]"
                  >
                    view proposal
                  </a>
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 font-sans text-xs font-medium transition-colors min-h-[36px] flex items-center active:scale-[0.97]"
                  >
                    copy link
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowCallModal(!showCallModal); setShowNoteModal(false) }}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 font-sans text-xs font-medium transition-colors min-h-[36px] flex items-center gap-1.5 active:scale-[0.97]"
                  >
                    <span className="text-[10px]">{'\u260E'}</span> log call
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowNoteModal(!showNoteModal); setShowCallModal(false) }}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 font-sans text-xs font-medium transition-colors min-h-[36px] flex items-center gap-1.5 active:scale-[0.97]"
                  >
                    <span className="text-[10px]">{'\u270E'}</span> add note
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

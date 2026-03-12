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
  sent: 'bg-gold',
  viewed: 'bg-sage',
  approved: 'bg-forest-400',
  rejected: 'bg-red-400',
}

const METHOD_BADGES: Record<string, string> = {
  auction: 'bg-gold/10 text-gold border-gold/20',
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

interface ProposalCardProps {
  proposal: DashboardProposal
  index: number
}

export function ProposalCard({ proposal, index }: ProposalCardProps) {
  const prefersReducedMotion = useReducedMotion()
  const [expanded, setExpanded] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [activitiesLoaded, setActivitiesLoaded] = useState(false)

  const loadActivities = useCallback(async () => {
    if (activitiesLoaded) return
    setActivitiesLoading(true)
    try {
      const res = await fetch(`/api/proposals?id=${proposal.id}&activities=true`)
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities || [])
      }
    } catch {
      // Silently fail — activities are supplementary
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

  const methodBadgeClass =
    proposal.methodOfSale
      ? METHOD_BADGES[proposal.methodOfSale.toLowerCase()] || 'bg-white/5 text-white/50 border-white/10'
      : null

  return (
    <motion.div
      layout
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
        className={`bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 cursor-pointer transition-all duration-200 hover:bg-white/[0.07] hover:shadow-lg hover:shadow-black/20 hover:scale-[1.01] active:scale-[0.99] ${
          expanded ? 'bg-white/[0.06] border-white/[0.12]' : ''
        }`}
      >
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
              <p className="text-white/30 font-sans text-[10px]">
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
                    <span className="text-gold/60">
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

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.06]">
                  <a
                    href={`/proposal/${proposal.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 font-sans text-xs font-medium transition-colors min-h-[36px] flex items-center"
                  >
                    view proposal
                  </a>
                  <a
                    href={`/proposal/${proposal.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 font-sans text-xs font-medium transition-colors min-h-[36px] flex items-center"
                  >
                    copy link
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

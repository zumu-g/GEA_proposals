'use client'

import { motion, useReducedMotion } from 'framer-motion'

export interface DashboardSummary {
  total: number
  draft: number
  sent: number
  viewed: number
  approved: number
  rejected: number
  awaitingResponse: number
  hotLeads: number
  recentlyCreated: number
}

interface StatsOverviewProps {
  summary: DashboardSummary
}

const stats = [
  { key: 'total', label: 'total', accent: 'border-white/10', valueColor: 'text-white' },
  { key: 'draft', label: 'drafts', accent: 'border-charcoal-500', valueColor: 'text-white' },
  { key: 'awaitingResponse', label: 'awaiting response', accent: 'border-[#C41E2A]/30', valueColor: 'text-[#C41E2A]' },
  { key: 'hotLeads', label: 'hot leads', accent: 'border-sage/30', valueColor: 'text-sage-300' },
  { key: 'approved', label: 'approved', accent: 'border-forest-400/30', valueColor: 'text-forest-300' },
  { key: 'recentlyCreated', label: 'last 7 days', accent: 'border-white/10', valueColor: 'text-white/70' },
] as const

export function StatsOverview({ summary }: StatsOverviewProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.key}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06, duration: 0.4, ease: 'easeOut' }}
          className={`bg-white/[0.04] border ${stat.accent} rounded-xl p-4 hover:bg-white/[0.06] transition-colors duration-200`}
        >
          <p className="text-white/50 font-sans text-[10px] tracking-wider-custom uppercase mb-2">
            {stat.label}
          </p>
          <p className={`${stat.valueColor} font-display text-2xl`}>
            {summary[stat.key]}
          </p>
        </motion.div>
      ))}
    </div>
  )
}

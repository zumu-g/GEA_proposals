'use client'

import { motion, useReducedMotion } from 'framer-motion'

export interface Activity {
  id: number
  proposal_id: string
  type: string
  description: string | null
  metadata: string | null
  created_at: string
}

const ACTIVITY_ICONS: Record<string, string> = {
  created: '\u25CB',
  sent: '\u2197',
  viewed: '\u25C9',
  approved: '\u2713',
  rejected: '\u2717',
  email_sent: '\u2709',
  call_logged: '\u260E',
  note_added: '\u270E',
}

const ACTIVITY_COLORS: Record<string, string> = {
  created: 'text-charcoal-300',
  sent: 'text-gold',
  viewed: 'text-sage',
  approved: 'text-forest-400',
  rejected: 'text-red-400',
  email_sent: 'text-gold-300',
  call_logged: 'text-sage-300',
  note_added: 'text-charcoal-300',
}

function formatActivityDate(dateString: string): string {
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
  if (diffDays < 7) return `${diffDays}d ago`

  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

interface ActivityLogProps {
  activities: Activity[]
  loading?: boolean
}

export function ActivityLog({ activities, loading }: ActivityLogProps) {
  const prefersReducedMotion = useReducedMotion()

  if (loading) {
    return (
      <div className="py-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 py-2">
            <div className="w-4 h-4 rounded-full bg-white/10 animate-pulse shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
              <div className="h-2.5 w-40 bg-white/5 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="py-4">
        <p className="text-white/40 font-sans text-xs">no activity recorded</p>
      </div>
    )
  }

  return (
    <div className="py-2">
      <p className="text-white/50 font-sans text-[10px] tracking-wider-custom uppercase mb-3">
        activity
      </p>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/10" />

        <div className="space-y-0">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className="flex items-start gap-3 py-1.5 relative"
            >
              <span
                className={`text-xs shrink-0 mt-0.5 relative z-10 bg-charcoal-700 w-4 h-4 flex items-center justify-center rounded-full ${ACTIVITY_COLORS[activity.type] || 'text-white/40'}`}
              >
                {ACTIVITY_ICONS[activity.type] || '\u2022'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-white/70 font-sans text-xs font-medium">
                    {activity.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-white/30 font-sans text-[10px]">
                    {formatActivityDate(activity.created_at)}
                  </span>
                </div>
                {activity.description && (
                  <p className="text-white/40 font-sans text-[11px] mt-0.5 truncate">
                    {activity.description}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

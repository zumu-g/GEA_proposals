'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

interface Notification {
  key: string
  type: 'call_due' | 'needs_followup' | 'stale' | 'new_proposal' | 'viewed' | 'approved'
  title: string
  description: string
  proposalId: string
  propertyAddress: string
  clientName: string
  priority: 'high' | 'medium' | 'low'
  createdAt: string
  read: boolean
}

const TYPE_ICONS: Record<string, string> = {
  call_due: '\u260E',
  needs_followup: '\u21BB',
  stale: '\u23F0',
  new_proposal: '\u2795',
  viewed: '\u25C9',
  approved: '\u2713',
}

const TYPE_COLORS: Record<string, string> = {
  call_due: 'text-[#C41E2A]',
  needs_followup: 'text-[#C41E2A]/80',
  stale: 'text-[#C41E2A]/60',
  new_proposal: 'text-sage',
  viewed: 'text-sage-300',
  approved: 'text-forest-300',
}

const PRIORITY_BORDER: Record<string, string> = {
  high: 'border-l-[#C41E2A]',
  medium: 'border-l-[#C41E2A]/40',
  low: 'border-l-white/10',
}

function formatNotificationTime(dateString: string): string {
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
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function getNotificationCTA(type: string): string {
  switch (type) {
    case 'call_due': return 'log call'
    case 'needs_followup': return 'follow up'
    case 'viewed': return 'view proposal'
    case 'approved': return 'next steps'
    case 'new_proposal': return 'review'
    default: return 'view'
  }
}

interface NotificationsPanelProps {
  onNavigateToProposal?: (proposalId: string) => void
}

export function NotificationsPanel({ onNavigateToProposal }: NotificationsPanelProps) {
  const prefersReducedMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [pulse, setPulse] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const prevUnreadRef = useRef(0)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)

        // Trigger pulse animation if new unread notifications arrived
        if (data.unreadCount > prevUnreadRef.current && prevUnreadRef.current >= 0) {
          setPulse(true)
          setTimeout(() => setPulse(false), 2000)
        }
        prevUnreadRef.current = data.unreadCount
      }
    } catch {
      // Fail silently
    }
  }, [])

  // Initial fetch and polling
  useEffect(() => {
    fetchNotifications()
    pollIntervalRef.current = setInterval(fetchNotifications, 30000) // Poll every 30s
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [fetchNotifications])

  // Close panel on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Mark notifications as read when panel opens
  useEffect(() => {
    if (open && unreadCount > 0) {
      const unreadKeys = notifications.filter(n => !n.read).map(n => n.key)
      if (unreadKeys.length > 0) {
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'read', keys: unreadKeys }),
        }).then(() => {
          setNotifications(prev => prev.map(n => ({ ...n, read: true })))
          setUnreadCount(0)
        }).catch(() => { /* ignore */ })
      }
    }
  }, [open, unreadCount, notifications])

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      })
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch {
      // ignore
    }
  }

  const handleDismiss = async (key: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', keys: [key] }),
      })
      setNotifications(prev => prev.filter(n => n.key !== key))
      setUnreadCount(prev => {
        const wasDismissedUnread = notifications.find(n => n.key === key && !n.read)
        return wasDismissedUnread ? Math.max(0, prev - 1) : prev
      })
    } catch {
      // ignore
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (onNavigateToProposal) {
      onNavigateToProposal(notification.proposalId)
    } else {
      // Fallback: open proposal in new tab
      window.open(`/proposal/${notification.proposalId}`, '_blank')
    }
    setOpen(false)
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all duration-200 min-h-[40px] min-w-[40px] flex items-center justify-center active:scale-[0.97]"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        {/* Bell icon */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white/50"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Badge count */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={prefersReducedMotion ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              exit={prefersReducedMotion ? undefined : { scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-[#C41E2A] text-white text-[10px] font-sans font-bold"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Pulse ring for new notifications */}
        {pulse && !prefersReducedMotion && (
          <motion.span
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 1, repeat: 2 }}
            className="absolute inset-0 rounded-lg border-2 border-[#C41E2A] pointer-events-none"
          />
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-[360px] max-h-[480px] bg-charcoal-800 border border-white/[0.12] rounded-xl shadow-2xl shadow-black/40 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
              <h3 className="text-white font-sans text-sm font-medium">notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-white/40 hover:text-white/70 font-sans text-[10px] tracking-wider-custom uppercase transition-colors"
                  >
                    mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Notifications list */}
            <div className="overflow-y-auto max-h-[420px] divide-y divide-white/[0.05]">
              {loading && notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-white/30 font-sans text-sm">all clear</p>
                  <p className="text-white/20 font-sans text-xs mt-1">no notifications right now</p>
                </div>
              ) : (
                notifications.map((notification, index) => (
                  <motion.div
                    key={notification.key}
                    initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.25 }}
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-4 py-3 cursor-pointer hover:bg-white/[0.04] transition-colors border-l-2 ${PRIORITY_BORDER[notification.priority]} ${
                      !notification.read ? 'bg-white/[0.02]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <span className={`text-sm mt-0.5 shrink-0 ${TYPE_COLORS[notification.type] || 'text-white/40'}`}>
                        {TYPE_ICONS[notification.type] || '\u2022'}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-sans text-xs font-medium ${!notification.read ? 'text-white' : 'text-white/70'}`}>
                            {notification.title}
                          </span>
                          {!notification.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C41E2A] shrink-0" />
                          )}
                        </div>
                        <p className="text-white/50 font-sans text-[11px] mt-0.5 truncate">
                          {notification.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-white/30 font-sans text-[10px]">
                            {formatNotificationTime(notification.createdAt)}
                          </span>
                          <span className="text-white/20">|</span>
                          <span className="text-[#C41E2A]/80 font-sans text-[10px] font-medium hover:text-[#C41E2A] transition-colors">
                            {getNotificationCTA(notification.type)}
                          </span>
                        </div>
                      </div>

                      {/* Dismiss button */}
                      <button
                        onClick={(e) => handleDismiss(notification.key, e)}
                        className="p-1 text-white/20 hover:text-white/60 transition-colors shrink-0 rounded hover:bg-white/5"
                        aria-label="Dismiss notification"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

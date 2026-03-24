'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

interface PriceGuide {
  min: number
  max: number
}

interface FeeInfo {
  commissionRate: number
  inclusions?: string[]
  marketingBudget?: string
}

interface PropertySale {
  address: string
  price: number
  date: string
  bedrooms: number
  bathrooms: number
  sqft: number
  distance: number
  url: string
  imageUrl?: string
}

interface OnMarketListing {
  address: string
  askingPrice: string
  bedrooms: number
  bathrooms: number
  cars: number
  propertyType: string
  url: string
  imageUrl?: string
  daysOnMarket?: number
}

interface AdvertisingActivity {
  category: string
  description: string
  cost?: number
  included?: boolean
}

interface AdvertisingWeek {
  week: number
  activities: AdvertisingActivity[]
}

interface ProposalData {
  id: string
  clientName: string
  clientEmail: string
  propertyAddress: string
  proposalDate: string
  priceGuide?: PriceGuide
  methodOfSale?: string
  fees?: FeeInfo
  totalAdvertisingCost?: number
  marketingApproach?: string
  recentSales: PropertySale[]
  onMarketListings?: OnMarketListing[]
  advertisingSchedule?: AdvertisingWeek[]
  status: string
  sentAt?: string
  viewedAt?: string
  approvedAt?: string
}

const SALE_METHODS = [
  { value: '', label: 'select method...' },
  { value: 'Auction', label: 'auction' },
  { value: 'Private Sale', label: 'private sale' },
  { value: 'Expressions of Interest', label: 'expressions of interest' },
  { value: 'N/A', label: 'n/a' },
]

const STATUS_OPTIONS = [
  { value: 'draft', label: 'draft', color: 'bg-white/10 text-white/60' },
  { value: 'sent', label: 'sent', color: 'bg-[#C41E2A]/10 text-[#C41E2A]' },
  { value: 'viewed', label: 'viewed', color: 'bg-[#8B9F82]/10 text-[#8B9F82]' },
  { value: 'approved', label: 'approved', color: 'bg-[#2D3830]/20 text-[#8B9F82]' },
  { value: 'rejected', label: 'rejected', color: 'bg-red-500/10 text-red-400' },
]

type TabKey = 'client' | 'sale' | 'comparables' | 'marketing' | 'status'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'client', label: 'client' },
  { key: 'sale', label: 'sale details' },
  { key: 'comparables', label: 'comparables' },
  { key: 'marketing', label: 'marketing costs' },
  { key: 'status', label: 'status & notes' },
]

function formatAud(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-white/10 text-white/60 border-white/20',
    sent: 'bg-[#C41E2A]/10 text-[#C41E2A] border-[#C41E2A]/20',
    viewed: 'bg-[#8B9F82]/10 text-[#8B9F82] border-[#8B9F82]/20',
    approved: 'bg-[#2D3830]/20 text-[#8B9F82] border-[#2D3830]/30',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  }

  return (
    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-sans font-medium border ${styles[status] || styles.draft}`}>
      {status}
    </span>
  )
}

// Empty row templates
function emptyComp(): PropertySale {
  return { address: '', price: 0, date: '', bedrooms: 0, bathrooms: 0, sqft: 0, distance: 0, url: '' }
}

function emptyActivity(): AdvertisingActivity {
  return { category: '', description: '', cost: 0 }
}

export default function EditProposalPage() {
  const params = useParams()
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('client')

  // Form state
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [priceGuideMin, setPriceGuideMin] = useState('')
  const [priceGuideMax, setPriceGuideMax] = useState('')
  const [methodOfSale, setMethodOfSale] = useState('')
  const [commissionRate, setCommissionRate] = useState('')
  const [marketingBudget, setMarketingBudget] = useState('')
  const [agentNotes, setAgentNotes] = useState('')
  const [recentSales, setRecentSales] = useState<PropertySale[]>([])
  const [onMarketListings, setOnMarketListings] = useState<OnMarketListing[]>([])
  const [advertisingSchedule, setAdvertisingSchedule] = useState<AdvertisingWeek[]>([])
  const [proposalStatus, setProposalStatus] = useState('')
  const [proposalDate, setProposalDate] = useState('')

  // Load proposal data
  const loadProposal = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/proposals/${id}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError('Proposal not found')
        } else {
          setError('Failed to load proposal')
        }
        return
      }
      const data: ProposalData = await res.json()
      setClientName(data.clientName || '')
      setClientEmail(data.clientEmail || '')
      setPropertyAddress(data.propertyAddress || '')
      setPriceGuideMin(data.priceGuide?.min?.toString() || '')
      setPriceGuideMax(data.priceGuide?.max?.toString() || '')
      setMethodOfSale(data.methodOfSale || '')
      setCommissionRate(data.fees?.commissionRate?.toString() || '')
      setMarketingBudget(data.totalAdvertisingCost?.toString() || '')
      setAgentNotes(data.marketingApproach || '')
      setRecentSales(data.recentSales || [])
      setOnMarketListings(data.onMarketListings || [])
      setAdvertisingSchedule(data.advertisingSchedule || [])
      setProposalStatus(data.status)
      setProposalDate(data.proposalDate)
      setHasChanges(false)
    } catch {
      setError('Failed to load proposal')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadProposal()
  }, [loadProposal])

  // Auto-clear save message
  useEffect(() => {
    if (saveMessage) {
      const t = setTimeout(() => setSaveMessage(null), 4000)
      return () => clearTimeout(t)
    }
  }, [saveMessage])

  const markChanged = () => {
    setHasChanges(true)
    setSaveMessage(null)
  }

  // Save proposal
  const handleSave = async () => {
    setSaving(true)
    setSaveMessage(null)
    try {
      const body: Record<string, unknown> = {
        clientName,
        clientEmail,
        propertyAddress,
        methodOfSale: methodOfSale || undefined,
        priceGuide: priceGuideMin && priceGuideMax
          ? { min: parseInt(priceGuideMin), max: parseInt(priceGuideMax) }
          : null,
        commissionRate: commissionRate || undefined,
        marketingBudget: marketingBudget || null,
        agentNotes: agentNotes || undefined,
        recentSales,
        onMarketListings,
        advertisingSchedule,
        status: proposalStatus,
      }

      const res = await fetch(`/api/proposals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      setSaveMessage({ type: 'success', text: 'proposal saved' })
      setHasChanges(false)
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  // Send proposal
  const handleSend = async () => {
    if (!confirm(`Send proposal to ${clientEmail}?`)) return
    setSending(true)
    setSaveMessage(null)
    try {
      if (hasChanges) {
        await handleSave()
      }

      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: id }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send')
      }

      setSaveMessage({ type: 'success', text: `proposal sent to ${clientEmail}` })
      setProposalStatus('sent')
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to send' })
    } finally {
      setSending(false)
    }
  }

  // Delete proposal
  const handleDelete = async () => {
    if (!confirm('Delete this proposal? This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/proposals/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete')
      }
      router.push('/dashboard')
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to delete' })
      setDeleting(false)
    }
  }

  // Comparable sales handlers
  const removeComp = (index: number) => {
    setRecentSales(prev => prev.filter((_, i) => i !== index))
    markChanged()
  }

  const addComp = () => {
    setRecentSales(prev => [...prev, emptyComp()])
    markChanged()
  }

  const updateComp = (index: number, field: keyof PropertySale, value: string | number) => {
    setRecentSales(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
    markChanged()
  }

  // On-market listing handlers
  const removeOnMarket = (index: number) => {
    setOnMarketListings(prev => prev.filter((_, i) => i !== index))
    markChanged()
  }

  // Advertising schedule handlers
  const updateActivity = (weekIdx: number, actIdx: number, field: keyof AdvertisingActivity, value: string | number | boolean) => {
    setAdvertisingSchedule(prev => {
      const updated = [...prev]
      const week = { ...updated[weekIdx] }
      const activities = [...week.activities]
      activities[actIdx] = { ...activities[actIdx], [field]: value }
      week.activities = activities
      updated[weekIdx] = week
      return updated
    })
    markChanged()
  }

  const removeActivity = (weekIdx: number, actIdx: number) => {
    setAdvertisingSchedule(prev => {
      const updated = [...prev]
      const week = { ...updated[weekIdx] }
      week.activities = week.activities.filter((_, i) => i !== actIdx)
      updated[weekIdx] = week
      // Remove empty weeks (except week 0 extras)
      return updated.filter(w => w.activities.length > 0 || w.week === 0)
    })
    markChanged()
  }

  const addActivity = (weekIdx: number) => {
    setAdvertisingSchedule(prev => {
      const updated = [...prev]
      const week = { ...updated[weekIdx] }
      week.activities = [...week.activities, emptyActivity()]
      updated[weekIdx] = week
      return updated
    })
    markChanged()
  }

  const addWeek = () => {
    const maxWeek = advertisingSchedule.reduce((max, w) => w.week > max ? w.week : max, 0)
    setAdvertisingSchedule(prev => [...prev, { week: maxWeek + 1, activities: [emptyActivity()] }])
    markChanged()
  }

  // Compute advertising total from schedule
  const computedAdTotal = advertisingSchedule.reduce((total, week) => {
    return total + week.activities.reduce((wt, a) => wt + (a.cost || 0), 0)
  }, 0)

  const fadeSlideUp = prefersReducedMotion
    ? {}
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }

  const inputClasses = 'w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-4 py-3 text-white/90 font-sans text-sm placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#C41E2A]/40 focus:border-[#C41E2A]/30 transition-all duration-200 min-h-[44px]'
  const inputSmClasses = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white/80 font-sans text-xs placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#C41E2A]/30 focus:border-[#C41E2A]/20 transition-all duration-200'
  const labelClasses = 'block text-white/50 font-sans text-xs font-medium mb-1.5 tracking-wide'

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#C41E2A]/30 border-t-[#C41E2A] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 font-sans text-sm">loading proposal...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-400 font-sans text-lg mb-4">{error}</p>
          <Link
            href="/dashboard"
            className="text-white/50 hover:text-white font-sans text-sm underline underline-offset-4 transition-colors"
          >
            back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A]">
      {/* Top bar */}
      <motion.header
        {...(prefersReducedMotion ? {} : { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 } })}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="sticky top-0 z-50 bg-[#1A1A1A]/90 backdrop-blur-md border-b border-white/[0.06]"
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-white/40 hover:text-white font-sans text-sm transition-colors duration-200 flex items-center gap-1.5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
              </svg>
              dashboard
            </Link>
            <div className="w-px h-5 bg-white/[0.08]" />
            <h1 className="font-serif text-white text-lg tracking-tight">edit proposal</h1>
            <StatusBadge status={proposalStatus} />
          </div>

          <div className="flex items-center gap-3">
            <motion.a
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href={`/proposal/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 font-sans text-xs font-medium transition-all duration-200 min-h-[40px] flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              preview
            </motion.a>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="px-5 py-2.5 bg-white/10 border border-white/15 rounded-lg text-white hover:bg-white/15 font-sans text-xs font-medium transition-all duration-200 min-h-[40px] flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  saving...
                </>
              ) : (
                'save changes'
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSend}
              disabled={sending}
              className="px-5 py-2.5 bg-[#C41E2A] border border-[#C41E2A] rounded-lg text-white hover:bg-[#d42532] font-sans text-xs font-medium transition-all duration-200 min-h-[40px] flex items-center gap-1.5 disabled:opacity-50"
            >
              {sending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  sending...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  send to client
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Save message toast */}
      <AnimatePresence>
        {saveMessage && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
          >
            <div className={`px-5 py-3 rounded-xl font-sans text-sm shadow-xl border ${
              saveMessage.type === 'success'
                ? 'bg-[#2D3830] text-[#8B9F82] border-[#8B9F82]/20'
                : 'bg-red-950 text-red-400 border-red-500/20'
            }`}>
              {saveMessage.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Property header */}
        <motion.div
          {...fadeSlideUp}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <p className="text-white/30 font-sans text-xs tracking-widest uppercase mb-2">
            {proposalDate && new Date(proposalDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h2 className="font-serif text-white text-2xl md:text-3xl tracking-tight leading-snug">
            {propertyAddress || 'untitled proposal'}
          </h2>
        </motion.div>

        {/* Tab navigation */}
        <motion.div
          {...fadeSlideUp}
          transition={{ duration: 0.4, delay: 0.05, ease: 'easeOut' }}
          className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1.5 overflow-x-auto"
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg font-sans text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {/* Client details tab */}
          {activeTab === 'client' && (
            <motion.section
              key="client"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 md:p-8 space-y-6"
            >
              <h3 className="font-serif text-white/80 text-lg tracking-tight">client details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClasses}>client name</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => { setClientName(e.target.value); markChanged() }}
                    placeholder="e.g. Tom & Lisa Chen"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className={labelClasses}>client email</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => { setClientEmail(e.target.value); markChanged() }}
                    placeholder="client@example.com"
                    className={inputClasses}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClasses}>property address</label>
                  <input
                    type="text"
                    value={propertyAddress}
                    onChange={(e) => { setPropertyAddress(e.target.value); markChanged() }}
                    placeholder="42 Smith St, Brighton VIC 3186"
                    className={inputClasses}
                  />
                </div>
              </div>
            </motion.section>
          )}

          {/* Sale details tab */}
          {activeTab === 'sale' && (
            <motion.section
              key="sale"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 md:p-8 space-y-6"
            >
              <h3 className="font-serif text-white/80 text-lg tracking-tight">sale details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className={labelClasses}>price guide (min)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-sans text-sm">$</span>
                    <input
                      type="number"
                      value={priceGuideMin}
                      onChange={(e) => { setPriceGuideMin(e.target.value); markChanged() }}
                      placeholder="2,200,000"
                      className={`${inputClasses} pl-8`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClasses}>price guide (max)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-sans text-sm">$</span>
                    <input
                      type="number"
                      value={priceGuideMax}
                      onChange={(e) => { setPriceGuideMax(e.target.value); markChanged() }}
                      placeholder="2,400,000"
                      className={`${inputClasses} pl-8`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClasses}>method of sale</label>
                  <select
                    value={methodOfSale}
                    onChange={(e) => { setMethodOfSale(e.target.value); markChanged() }}
                    className={`${inputClasses} cursor-pointer`}
                  >
                    {SALE_METHODS.map(m => (
                      <option key={m.value} value={m.value} className="bg-[#1A1A1A]">{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClasses}>commission rate (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      value={commissionRate}
                      onChange={(e) => { setCommissionRate(e.target.value); markChanged() }}
                      placeholder="1.45"
                      className={inputClasses}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 font-sans text-sm">%</span>
                  </div>
                </div>
                <div>
                  <label className={labelClasses}>marketing budget</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-sans text-sm">$</span>
                    <input
                      type="number"
                      value={marketingBudget}
                      onChange={(e) => { setMarketingBudget(e.target.value); markChanged() }}
                      placeholder="3,895"
                      className={`${inputClasses} pl-8`}
                    />
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {/* Comparables tab */}
          {activeTab === 'comparables' && (
            <motion.div
              key="comparables"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-6"
            >
              {/* Recent sales */}
              <section className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 md:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-white/80 text-lg tracking-tight">comparable sales</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-white/30 font-sans text-xs">{recentSales.length} properties</span>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={addComp}
                      className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/50 hover:text-white hover:bg-white/10 font-sans text-xs font-medium transition-all duration-200"
                    >
                      + add row
                    </motion.button>
                  </div>
                </div>

                {recentSales.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-white/25 font-sans text-sm mb-3">no comparable sales attached</p>
                    <button
                      onClick={addComp}
                      className="text-[#C41E2A]/60 hover:text-[#C41E2A] font-sans text-xs font-medium transition-colors"
                    >
                      + add a comparable sale
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentSales.map((sale, index) => (
                      <motion.div
                        key={`comp-${index}`}
                        layout
                        initial={prefersReducedMotion ? false : { opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25 }}
                        className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 space-y-3 group/row"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={sale.address}
                              onChange={(e) => updateComp(index, 'address', e.target.value)}
                              placeholder="Property address"
                              className={inputSmClasses}
                            />
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => removeComp(index)}
                            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                            title="Remove comparable"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </motion.button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                          <div>
                            <label className="block text-white/30 font-sans text-[10px] mb-1">price ($)</label>
                            <input
                              type="number"
                              value={sale.price || ''}
                              onChange={(e) => updateComp(index, 'price', parseFloat(e.target.value) || 0)}
                              placeholder="1,200,000"
                              className={inputSmClasses}
                            />
                          </div>
                          <div>
                            <label className="block text-white/30 font-sans text-[10px] mb-1">beds</label>
                            <input
                              type="number"
                              value={sale.bedrooms || ''}
                              onChange={(e) => updateComp(index, 'bedrooms', parseInt(e.target.value) || 0)}
                              placeholder="3"
                              className={inputSmClasses}
                            />
                          </div>
                          <div>
                            <label className="block text-white/30 font-sans text-[10px] mb-1">baths</label>
                            <input
                              type="number"
                              value={sale.bathrooms || ''}
                              onChange={(e) => updateComp(index, 'bathrooms', parseInt(e.target.value) || 0)}
                              placeholder="2"
                              className={inputSmClasses}
                            />
                          </div>
                          <div>
                            <label className="block text-white/30 font-sans text-[10px] mb-1">land (sqm)</label>
                            <input
                              type="number"
                              value={sale.sqft || ''}
                              onChange={(e) => updateComp(index, 'sqft', parseInt(e.target.value) || 0)}
                              placeholder="650"
                              className={inputSmClasses}
                            />
                          </div>
                          <div>
                            <label className="block text-white/30 font-sans text-[10px] mb-1">date</label>
                            <input
                              type="text"
                              value={sale.date}
                              onChange={(e) => updateComp(index, 'date', e.target.value)}
                              placeholder="Mar 2026"
                              className={inputSmClasses}
                            />
                          </div>
                          <div>
                            <label className="block text-white/30 font-sans text-[10px] mb-1">distance (km)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={sale.distance || ''}
                              onChange={(e) => updateComp(index, 'distance', parseFloat(e.target.value) || 0)}
                              placeholder="0.5"
                              className={inputSmClasses}
                            />
                          </div>
                        </div>
                        {sale.price > 0 && (
                          <p className="text-[#C41E2A]/60 font-sans text-xs font-medium">
                            {formatAud(sale.price)}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </section>

              {/* On-market listings */}
              <section className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 md:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-white/80 text-lg tracking-tight">on-market listings</h3>
                  <span className="text-white/30 font-sans text-xs">{onMarketListings.length} properties</span>
                </div>

                {onMarketListings.length === 0 ? (
                  <p className="text-white/25 font-sans text-sm py-6 text-center">no on-market listings attached</p>
                ) : (
                  <div className="space-y-2">
                    {onMarketListings.map((listing, index) => (
                      <motion.div
                        key={`om-${listing.address}-${index}`}
                        layout
                        initial={prefersReducedMotion ? false : { opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={prefersReducedMotion ? undefined : { opacity: 0, x: 10, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.05] rounded-lg px-4 py-3 group/row"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-white/80 font-sans text-sm truncate">{listing.address}</p>
                          <div className="flex items-center gap-3 mt-1 text-white/40 font-sans text-xs">
                            {listing.askingPrice && (
                              <span className="text-[#8B9F82]/80 font-medium">{listing.askingPrice}</span>
                            )}
                            {listing.bedrooms > 0 && <span>{listing.bedrooms} bed</span>}
                            {listing.bathrooms > 0 && <span>{listing.bathrooms} bath</span>}
                            {listing.cars > 0 && <span>{listing.cars} car</span>}
                            {listing.propertyType && <span>{listing.propertyType}</span>}
                            {listing.daysOnMarket != null && <span>{listing.daysOnMarket}d on market</span>}
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => removeOnMarket(index)}
                          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 opacity-0 group-hover/row:opacity-100"
                          title="Remove listing"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {/* Marketing costs tab */}
          {activeTab === 'marketing' && (
            <motion.section
              key="marketing"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 md:p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-white/80 text-lg tracking-tight">marketing costs</h3>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-white/30 font-sans text-[10px] uppercase tracking-wider">schedule total</p>
                    <p className="text-[#C41E2A] font-sans text-sm font-medium">{formatAud(computedAdTotal)}</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={addWeek}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/50 hover:text-white hover:bg-white/10 font-sans text-xs font-medium transition-all duration-200"
                  >
                    + add week
                  </motion.button>
                </div>
              </div>

              {advertisingSchedule.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-white/25 font-sans text-sm mb-3">no marketing schedule configured</p>
                  <button
                    onClick={addWeek}
                    className="text-[#C41E2A]/60 hover:text-[#C41E2A] font-sans text-xs font-medium transition-colors"
                  >
                    + add a week
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {advertisingSchedule.map((week, weekIdx) => (
                    <div key={`week-${week.week}-${weekIdx}`} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h4 className="text-white/50 font-sans text-xs font-medium uppercase tracking-wider">
                          {week.week === 0 ? 'extras / campaign-wide' : `week ${week.week}`}
                        </h4>
                        <div className="flex-1 h-px bg-white/[0.06]" />
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => addActivity(weekIdx)}
                          className="text-white/30 hover:text-white/60 font-sans text-[10px] font-medium transition-colors"
                        >
                          + add item
                        </motion.button>
                      </div>

                      {week.activities.map((activity, actIdx) => (
                        <motion.div
                          key={`act-${weekIdx}-${actIdx}`}
                          layout
                          className="grid grid-cols-12 gap-2 items-center group/act"
                        >
                          <div className="col-span-3">
                            <input
                              type="text"
                              value={activity.category}
                              onChange={(e) => updateActivity(weekIdx, actIdx, 'category', e.target.value)}
                              placeholder="Category"
                              className={inputSmClasses}
                            />
                          </div>
                          <div className="col-span-4">
                            <input
                              type="text"
                              value={activity.description}
                              onChange={(e) => updateActivity(weekIdx, actIdx, 'description', e.target.value)}
                              placeholder="Description"
                              className={inputSmClasses}
                            />
                          </div>
                          <div className="col-span-2">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/20 font-sans text-xs">$</span>
                              <input
                                type="number"
                                value={activity.cost || ''}
                                onChange={(e) => updateActivity(weekIdx, actIdx, 'cost', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                disabled={activity.included}
                                className={`${inputSmClasses} pl-6 ${activity.included ? 'opacity-30' : ''}`}
                              />
                            </div>
                          </div>
                          <div className="col-span-2 flex items-center gap-2">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={activity.included || false}
                                onChange={(e) => updateActivity(weekIdx, actIdx, 'included', e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-[#C41E2A] focus:ring-[#C41E2A]/30 cursor-pointer"
                              />
                              <span className="text-white/30 font-sans text-[10px]">incl.</span>
                            </label>
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => removeActivity(weekIdx, actIdx)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 opacity-0 group-hover/act:opacity-100"
                              title="Remove item"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Marketing budget override */}
              <div className="pt-4 border-t border-white/[0.06]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClasses}>marketing budget override</label>
                    <p className="text-white/25 font-sans text-[10px] mb-2">
                      overrides the computed schedule total shown to the client
                    </p>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-sans text-sm">$</span>
                      <input
                        type="number"
                        value={marketingBudget}
                        onChange={(e) => { setMarketingBudget(e.target.value); markChanged() }}
                        placeholder={computedAdTotal > 0 ? computedAdTotal.toString() : '3,895'}
                        className={`${inputClasses} pl-8`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {/* Status & notes tab */}
          {activeTab === 'status' && (
            <motion.div
              key="status"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-6"
            >
              {/* Status */}
              <section className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 md:p-8 space-y-6">
                <h3 className="font-serif text-white/80 text-lg tracking-tight">proposal status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClasses}>status</label>
                    <select
                      value={proposalStatus}
                      onChange={(e) => { setProposalStatus(e.target.value); markChanged() }}
                      className={`${inputClasses} cursor-pointer`}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s.value} value={s.value} className="bg-[#1A1A1A]">{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <StatusBadge status={proposalStatus} />
                  </div>
                </div>
              </section>

              {/* Agent notes */}
              <section className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 md:p-8 space-y-4">
                <h3 className="font-serif text-white/80 text-lg tracking-tight">agent notes</h3>
                <p className="text-white/30 font-sans text-xs">
                  internal notes or comments about the campaign strategy
                </p>
                <textarea
                  value={agentNotes}
                  onChange={(e) => { setAgentNotes(e.target.value); markChanged() }}
                  placeholder="Add notes about the selling strategy, vendor expectations, market conditions..."
                  rows={5}
                  className={`${inputClasses} resize-y min-h-[120px]`}
                />
              </section>

              {/* Danger zone */}
              <section className="bg-red-950/20 border border-red-500/10 rounded-xl p-6 md:p-8 space-y-4">
                <h3 className="font-serif text-red-400/80 text-lg tracking-tight">danger zone</h3>
                <p className="text-white/30 font-sans text-xs">
                  permanently delete this proposal and all associated data
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 font-sans text-xs font-medium transition-all duration-200 disabled:opacity-50"
                >
                  {deleting ? 'deleting...' : 'delete proposal'}
                </motion.button>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom action bar */}
        <motion.div
          {...fadeSlideUp}
          transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
          className="flex items-center justify-between pt-4 pb-12"
        >
          <Link
            href="/dashboard"
            className="text-white/40 hover:text-white font-sans text-sm transition-colors duration-200 flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
            </svg>
            back to dashboard
          </Link>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <motion.span
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white/30 font-sans text-xs"
              >
                unsaved changes
              </motion.span>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="px-6 py-3 bg-white/10 border border-white/15 rounded-lg text-white hover:bg-white/15 font-sans text-sm font-medium transition-all duration-200 min-h-[44px] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {saving ? 'saving...' : 'save changes'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSend}
              disabled={sending}
              className="px-6 py-3 bg-[#C41E2A] border border-[#C41E2A] rounded-lg text-white hover:bg-[#d42532] font-sans text-sm font-medium transition-all duration-200 min-h-[44px] flex items-center gap-2 disabled:opacity-50"
            >
              {sending ? 'sending...' : 'send to client'}
            </motion.button>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

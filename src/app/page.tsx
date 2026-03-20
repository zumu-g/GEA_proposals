'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

interface PropertyImages {
  heroImage: string
  galleryImages: string[]
}

interface MarketingCostItem {
  category: string
  description: string
  cost: number
  included: boolean
}

const DEFAULT_MARKETING_COSTS: MarketingCostItem[] = [
  { category: 'Premiere Listing — realestate.com.au', description: '4 week premiere listing (Value $2,700)', cost: 1600, included: false },
  { category: 'Professional Photography', description: 'Including site plan and floorplan (Value $400)', cost: 450, included: false },
  { category: 'Signboard', description: 'Premium corporate board', cost: 375, included: false },
  { category: 'Internet Listings', description: 'realestate.com, domain.com and 4 other sites (Value $750)', cost: 0, included: true },
  { category: 'Social Media Campaign', description: 'Targeted Facebook and Instagram campaign', cost: 0, included: true },
  { category: 'Brochures', description: 'Premium property brochures for open homes', cost: 150, included: false },
  { category: 'Drone Photography', description: 'Aerial drone photography and video', cost: 280, included: false },
  { category: 'Auctioneer Fees', description: 'Professional auctioneer services', cost: 700, included: false },
  { category: 'Window Cards', description: 'Office window card display', cost: 0, included: true },
  { category: 'Open Homes', description: 'Weekly open home inspections', cost: 0, included: true },
]

interface RecentProposal {
  id: string
  clientName: string
  propertyAddress: string
  proposalDate: string
  status: string
  methodOfSale?: string
  priceGuide?: { min: number; max: number }
  fees?: { commissionRate: number }
}

export default function HomePage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: boolean; message?: string } | null>(null)
  const [result, setResult] = useState<{ success: boolean; url?: string; id?: string; error?: string; clientName?: string; clientEmail?: string; propertyAddress?: string } | null>(null)
  const [origin, setOrigin] = useState('')
  const submittingRef = useRef(false)
  const [recentProposals, setRecentProposals] = useState<RecentProposal[]>([])
  const [showRecent, setShowRecent] = useState(true)
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null)

  // Property image auto-fetch state
  const [propertyImages, setPropertyImages] = useState<PropertyImages | null>(null)
  const [isFetchingImages, setIsFetchingImages] = useState(false)
  const [useAutoImage, setUseAutoImage] = useState(true)
  const [addressValue, setAddressValue] = useState('')
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchedAddressRef = useRef('')

  // Hero image upload state
  const [heroUploadUrl, setHeroUploadUrl] = useState('')
  const [isUploadingHero, setIsUploadingHero] = useState(false)

  // Comparable sales (editable table)
  interface CompRow { address: string; price: string; date: string; bedrooms: string; bathrooms: string; url: string }
  const [compRows, setCompRows] = useState<CompRow[]>([])
  const [isSearchingComps, setIsSearchingComps] = useState(false)

  // On-market listings (editable table)
  interface OnMarketRow { address: string; askingPrice: string; bedrooms: string; bathrooms: string; propertyType: string; url: string }
  const [onMarketRows, setOnMarketRows] = useState<OnMarketRow[]>([])

  const [compsError, setCompsError] = useState('')

  const searchComparables = async () => {
    // Get address from state or from the input directly
    const addr = addressValue || formRef.current?.querySelector<HTMLInputElement>('#propertyAddress')?.value || ''
    if (!addr) {
      setCompsError('Enter a property address first')
      return
    }
    if (isSearchingComps) return

    setIsSearchingComps(true)
    setCompsError('')

    try {
      const [soldRes, buyRes] = await Promise.all([
        fetch(`/api/comparables?address=${encodeURIComponent(addr)}`),
        fetch(`/api/comparables?address=${encodeURIComponent(addr)}&type=buy`),
      ])
      const soldData = await soldRes.json()
      const buyData = await buyRes.json()

      if (soldData.error) {
        setCompsError(`Sold search failed: ${soldData.error}`)
      } else if (soldData.sales?.length > 0) {
        setCompRows(soldData.sales.map((s: any) => ({
          address: s.address || '',
          price: s.price ? String(s.price) : '',
          date: s.date || '',
          bedrooms: s.bedrooms ? String(s.bedrooms) : '',
          bathrooms: s.bathrooms ? String(s.bathrooms) : '',
          url: s.url || '',
        })))
      } else {
        setCompsError(`No sold properties found for "${addr}"`)
      }

      if (buyData.sales?.length > 0) {
        setOnMarketRows(buyData.sales.map((s: any) => ({
          address: s.address || '',
          askingPrice: s.askingPrice || s.price ? String(s.askingPrice || s.price) : '',
          bedrooms: s.bedrooms ? String(s.bedrooms) : '',
          bathrooms: s.bathrooms ? String(s.bathrooms) : '',
          propertyType: s.propertyType || 'House',
          url: s.url || '',
        })))
      }
    } catch (err) {
      setCompsError(`Search failed: ${err instanceof Error ? err.message : 'network error'}`)
    }
    setIsSearchingComps(false)
  }

  const updateCompRow = (index: number, field: keyof CompRow, value: string) => {
    setCompRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }
  const removeCompRow = (index: number) => {
    setCompRows(prev => prev.filter((_, i) => i !== index))
  }
  const addCompRow = () => {
    setCompRows(prev => [...prev, { address: '', price: '', date: '', bedrooms: '', bathrooms: '', url: '' }])
  }

  const updateOnMarketRow = (index: number, field: keyof OnMarketRow, value: string) => {
    setOnMarketRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }
  const removeOnMarketRow = (index: number) => {
    setOnMarketRows(prev => prev.filter((_, i) => i !== index))
  }
  const addOnMarketRow = () => {
    setOnMarketRows(prev => [...prev, { address: '', askingPrice: '', bedrooms: '', bathrooms: '', propertyType: 'House', url: '' }])
  }

  // Marketing costs state
  const [marketingCosts, setMarketingCosts] = useState<MarketingCostItem[]>(DEFAULT_MARKETING_COSTS)

  const marketingTotal = marketingCosts
    .filter(item => !item.included)
    .reduce((sum, item) => sum + item.cost, 0)

  const updateMarketingItem = (index: number, field: keyof MarketingCostItem, value: string | number | boolean) => {
    setMarketingCosts(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const removeMarketingItem = (index: number) => {
    setMarketingCosts(prev => prev.filter((_, i) => i !== index))
  }

  const addMarketingItem = () => {
    setMarketingCosts(prev => [...prev, { category: '', description: '', cost: 0, included: false }])
  }

  // --- localStorage draft persistence ---
  const DRAFT_KEY = 'gea-proposal-draft'
  const saveDraftTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Save draft to localStorage (debounced)
  const saveDraft = useCallback(() => {
    if (saveDraftTimerRef.current) clearTimeout(saveDraftTimerRef.current)
    saveDraftTimerRef.current = setTimeout(() => {
      try {
        const form = formRef.current
        const draft = {
          addressValue,
          heroUploadUrl,
          marketingCosts,
          clientName: form?.querySelector<HTMLInputElement>('#clientName')?.value || '',
          clientEmail: form?.querySelector<HTMLInputElement>('#clientEmail')?.value || '',
          heroImageUrl: form?.querySelector<HTMLInputElement>('#heroImage')?.value || '',
          commissionRate: form?.querySelector<HTMLInputElement>('#commissionRate')?.value || '',
          priceGuideMin: form?.querySelector<HTMLInputElement>('#priceGuideMin')?.value || '',
          priceGuideMax: form?.querySelector<HTMLInputElement>('#priceGuideMax')?.value || '',
          methodOfSale: (form?.querySelector<HTMLInputElement>('input[name="methodOfSale"]:checked'))?.value || '',
          savedAt: new Date().toISOString(),
        }
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
      } catch {}
    }, 500)
  }, [addressValue, heroUploadUrl, marketingCosts])

  // Restore draft on mount
  useEffect(() => {
    setOrigin(window.location.origin)

    // Restore saved draft
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const draft = JSON.parse(saved)
        if (draft.addressValue) setAddressValue(draft.addressValue)
        if (draft.heroUploadUrl) setHeroUploadUrl(draft.heroUploadUrl)
        if (draft.marketingCosts?.length > 0) setMarketingCosts(draft.marketingCosts)

        // Restore form inputs after render
        setTimeout(() => {
          const form = formRef.current
          if (!form) return
          if (draft.clientName) {
            const el = form.querySelector<HTMLInputElement>('#clientName')
            if (el) el.value = draft.clientName
          }
          if (draft.clientEmail) {
            const el = form.querySelector<HTMLInputElement>('#clientEmail')
            if (el) el.value = draft.clientEmail
          }
          if (draft.heroImageUrl) {
            const el = form.querySelector<HTMLInputElement>('#heroImage')
            if (el) el.value = draft.heroImageUrl
          }
          if (draft.commissionRate) {
            const el = form.querySelector<HTMLInputElement>('#commissionRate')
            if (el) el.value = draft.commissionRate
          }
          if (draft.priceGuideMin) {
            const el = form.querySelector<HTMLInputElement>('#priceGuideMin')
            if (el) el.value = draft.priceGuideMin
          }
          if (draft.priceGuideMax) {
            const el = form.querySelector<HTMLInputElement>('#priceGuideMax')
            if (el) el.value = draft.priceGuideMax
          }
          if (draft.methodOfSale !== undefined) {
            const radios = form.querySelectorAll<HTMLInputElement>('input[name="methodOfSale"]')
            radios.forEach(r => { r.checked = r.value === draft.methodOfSale })
          }
        }, 200)
      }
    } catch {}

    // Fetch recent proposals
    fetch('/api/proposals')
      .then(res => res.json())
      .then(data => {
        if (data.proposals) {
          setRecentProposals(data.proposals.slice(0, 6))
        }
      })
      .catch(() => {})
  }, [])

  // Auto-save draft on state changes
  useEffect(() => {
    saveDraft()
  }, [addressValue, heroUploadUrl, marketingCosts, saveDraft])

  // Also save on input changes (for text fields not in React state)
  const handleInputChange = useCallback(() => {
    saveDraft()
  }, [saveDraft])

  // Clear draft on successful submission
  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(DRAFT_KEY) } catch {}
  }, [])

  // Form refs for pre-filling on duplicate
  const formRef = useRef<HTMLFormElement>(null)

  const handleDuplicate = async (proposalId: string) => {
    try {
      const res = await fetch(`/api/proposals?id=${proposalId}`)
      const proposal = await res.json()
      if (!proposal || proposal.error) return

      // Pre-fill form fields
      setAddressValue('')
      setPropertyImages(null)

      // Pre-fill marketing costs from the proposal's advertising schedule
      if (proposal.advertisingSchedule) {
        const items: MarketingCostItem[] = []
        for (const week of proposal.advertisingSchedule) {
          for (const act of week.activities) {
            // Avoid duplicating ongoing items from weeks 2-4
            if (week.week > 1 && act.included) continue
            items.push({
              category: act.category,
              description: act.description,
              cost: act.cost || 0,
              included: !!act.included,
            })
          }
        }
        if (items.length > 0) setMarketingCosts(items)
      }

      // Pre-fill form inputs after render
      setTimeout(() => {
        const form = formRef.current
        if (!form) return

        // Commission rate
        const commInput = form.querySelector('#commissionRate') as HTMLInputElement
        if (commInput && proposal.fees?.commissionRate) {
          commInput.value = String(proposal.fees.commissionRate)
        }

        // Price guide
        const minInput = form.querySelector('#priceGuideMin') as HTMLInputElement
        const maxInput = form.querySelector('#priceGuideMax') as HTMLInputElement
        if (minInput && proposal.priceGuide?.min) minInput.value = String(proposal.priceGuide.min)
        if (maxInput && proposal.priceGuide?.max) maxInput.value = String(proposal.priceGuide.max)

        // Method of sale — check the matching radio
        if (proposal.methodOfSale) {
          const radios = form.querySelectorAll('input[name="methodOfSale"]') as NodeListOf<HTMLInputElement>
          radios.forEach(r => {
            r.checked = r.value === proposal.methodOfSale
          })
        }
      }, 100)

      // Scroll to form
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch {
      // Silently fail
    }
  }

  const handleEdit = async (proposalId: string) => {
    try {
      const res = await fetch(`/api/proposals?id=${proposalId}`)
      const proposal = await res.json()
      if (!proposal || proposal.error) return

      setEditingProposalId(proposalId)
      setResult(null)

      // Pre-fill address
      setAddressValue(proposal.propertyAddress || '')

      // Pre-fill hero image
      if (proposal.heroImage) setHeroUploadUrl(proposal.heroImage)

      // Pre-fill marketing costs
      if (proposal.advertisingSchedule) {
        const items: MarketingCostItem[] = []
        for (const week of proposal.advertisingSchedule) {
          for (const act of week.activities) {
            if (week.week > 1 && act.included) continue
            items.push({
              category: act.category,
              description: act.description,
              cost: act.cost || 0,
              included: !!act.included,
            })
          }
        }
        if (items.length > 0) setMarketingCosts(items)
      }

      // Pre-fill comparables
      if (proposal.recentSales?.length > 0) {
        setCompRows(proposal.recentSales.map((s: any) => ({
          address: s.address || '',
          price: s.price ? String(s.price) : '',
          date: s.date || '',
          bedrooms: s.bedrooms ? String(s.bedrooms) : '',
          bathrooms: s.bathrooms ? String(s.bathrooms) : '',
          url: s.url || '',
        })))
      }

      // Pre-fill on-market
      if (proposal.onMarketListings?.length > 0) {
        setOnMarketRows(proposal.onMarketListings.map((s: any) => ({
          address: s.address || '',
          askingPrice: s.askingPrice || '',
          bedrooms: s.bedrooms ? String(s.bedrooms) : '',
          bathrooms: s.bathrooms ? String(s.bathrooms) : '',
          propertyType: s.propertyType || 'House',
          url: s.url || '',
        })))
      }

      // Pre-fill form inputs after render
      setTimeout(() => {
        const form = formRef.current
        if (!form) return

        const setVal = (id: string, val: string) => {
          const el = form.querySelector<HTMLInputElement>(`#${id}`)
          if (el && val) el.value = val
        }

        setVal('clientName', proposal.clientName || '')
        setVal('clientEmail', proposal.clientEmail || '')
        setVal('commissionRate', proposal.fees?.commissionRate ? String(proposal.fees.commissionRate) : '')
        setVal('priceGuideMin', proposal.priceGuide?.min ? String(proposal.priceGuide.min) : '')
        setVal('priceGuideMax', proposal.priceGuide?.max ? String(proposal.priceGuide.max) : '')

        if (proposal.methodOfSale) {
          const radios = form.querySelectorAll<HTMLInputElement>('input[name="methodOfSale"]')
          radios.forEach(r => { r.checked = r.value === proposal.methodOfSale })
        }
      }, 100)

      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch {}
  }

  // Check if address looks complete (has a 4-digit postcode)
  const isAddressComplete = useCallback((address: string) => {
    return /\d{4}\s*$/.test(address.trim())
  }, [])

  // Fetch property images from API
  const fetchPropertyImages = useCallback(async (address: string) => {
    if (!address || !isAddressComplete(address)) return
    if (lastFetchedAddressRef.current === address) return

    lastFetchedAddressRef.current = address
    setIsFetchingImages(true)

    try {
      const response = await fetch(`/api/property-images?address=${encodeURIComponent(address)}`)
      if (response.ok) {
        const data = await response.json()
        if (data.heroImage) {
          setPropertyImages({
            heroImage: data.heroImage,
            galleryImages: data.galleryImages || [],
          })
          setUseAutoImage(true)
        } else {
          setPropertyImages(null)
        }
      } else {
        setPropertyImages(null)
      }
    } catch {
      setPropertyImages(null)
    } finally {
      setIsFetchingImages(false)
    }
  }, [isAddressComplete])

  // Debounced address change handler
  const handleAddressChange = useCallback((value: string) => {
    setAddressValue(value)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (!value || !isAddressComplete(value)) {
      return
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchPropertyImages(value)
    }, 1000)
  }, [isAddressComplete, fetchPropertyImages])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setIsSubmitting(true)
    setResult(null)
    setSendResult(null)

    const formData = new FormData(e.currentTarget)

    // If editing, add the proposal ID
    if (editingProposalId) {
      formData.append('editProposalId', editingProposalId)
    }

    try {
      const response = await fetch('/api/proposals', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          url: data.proposal.url,
          id: data.proposal.id,
          clientName: formData.get('clientName') as string,
          clientEmail: formData.get('clientEmail') as string,
          propertyAddress: formData.get('propertyAddress') as string,
        })
        ;(e.target as HTMLFormElement).reset()
        setPropertyImages(null)
        setAddressValue('')
        setUseAutoImage(true)
        lastFetchedAddressRef.current = ''
        setMarketingCosts(DEFAULT_MARKETING_COSTS)
        setHeroUploadUrl('')
        setCompRows([])
        setOnMarketRows([])
        setEditingProposalId(null)
        clearDraft()
        // Refresh recent proposals list
        fetch('/api/proposals').then(r => r.json()).then(d => {
          if (d.proposals) setRecentProposals(d.proposals.slice(0, 6))
        }).catch(() => {})
      } else {
        setResult({
          success: false,
          error: data.details || data.error || 'Failed to create proposal',
        })
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      })
    } finally {
      setIsSubmitting(false)
      submittingRef.current = false
    }
  }

  const handleSend = async () => {
    if (!result?.id) return
    setIsSending(true)
    setSendResult(null)

    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: result.id }),
      })

      const data = await response.json()

      if (response.ok) {
        setSendResult({ success: true, message: data.message })
      } else {
        setSendResult({ success: false, message: data.error || 'Failed to send' })
      }
    } catch (error) {
      setSendResult({ success: false, message: 'Failed to send email' })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Gold accent line at top */}
      <div className="w-full h-1 bg-gold" />

      <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-16 sm:py-20 lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12 sm:mb-16 gap-4">
            <div>
              <p className="text-gold font-sans text-sm tracking-wider-custom mb-6">
                grant estate agents
              </p>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-white lowercase mb-4">
                create proposal
              </h1>
              <div className="gold-accent-line mb-6" />
              <p className="text-white/50 font-sans text-lg font-light max-w-lg">
                generate a professional online proposal for your clients
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-5 py-3 bg-white/5 border border-white/10 rounded text-white/60 hover:text-white hover:bg-white/10 font-sans text-sm font-medium transition-colors min-h-[44px]"
            >
              view all proposals
            </Link>
          </div>

          {/* Recent proposals */}
          {recentProposals.length > 0 && showRecent && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-6">
                <p className="text-white/40 font-sans text-xs tracking-wider-custom uppercase">recent proposals — duplicate to start new</p>
                <button
                  onClick={() => setShowRecent(false)}
                  className="text-white/20 hover:text-white/40 font-sans text-xs transition-colors"
                >
                  hide
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentProposals.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 rounded-lg p-5 hover:border-white/20 transition-all group"
                  >
                    <p className="font-display text-base font-normal text-white lowercase mb-1 line-clamp-1">
                      {p.propertyAddress.toLowerCase()}
                    </p>
                    <p className="text-white/40 font-sans text-xs font-light mb-1">
                      {p.clientName}
                    </p>
                    <div className="flex items-center gap-2 mb-4">
                      {p.methodOfSale && (
                        <span className="px-2 py-0.5 rounded bg-white/5 text-white/40 font-sans text-xs">
                          {p.methodOfSale.toLowerCase()}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded font-sans text-xs ${
                        p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                        p.status === 'sent' ? 'bg-blue-500/10 text-blue-400' :
                        p.status === 'viewed' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-white/5 text-white/40'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(p.id)}
                        className="flex-1 px-3 py-2 bg-brand/10 border border-brand/20 rounded text-brand hover:bg-brand/20 font-sans text-xs font-medium transition-colors min-h-[36px]"
                      >
                        edit
                      </button>
                      <button
                        onClick={() => handleDuplicate(p.id)}
                        className="px-3 py-2 bg-gold/10 border border-gold/20 rounded text-gold hover:bg-gold/20 font-sans text-xs font-medium transition-colors min-h-[36px]"
                      >
                        duplicate
                      </button>
                      <a
                        href={`/proposal/${p.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded text-white/40 hover:text-white/70 font-sans text-xs font-medium transition-colors min-h-[36px] flex items-center"
                      >
                        view
                      </a>
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete proposal for ${p.propertyAddress}?`)) return
                          try {
                            const res = await fetch(`/api/proposals?id=${p.id}`, { method: 'DELETE' })
                            if (res.ok) {
                              setRecentProposals(prev => prev.filter(rp => rp.id !== p.id))
                            }
                          } catch {}
                        }}
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded text-white/20 hover:text-red-400 hover:border-red-400/30 font-sans text-xs font-medium transition-colors min-h-[36px] flex items-center"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Form */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 sm:p-8 lg:p-10">
            <form ref={formRef} onSubmit={handleSubmit} onChange={handleInputChange} className="space-y-8">
              {/* Result - shown instead of form fields on success */}
              {result?.success ? (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-8 space-y-8"
                >
                  <div>
                    <div className="gold-accent-line mb-6" />
                    <p className="font-display text-2xl text-white lowercase mb-3">proposal created</p>
                    <p className="text-white/40 font-sans text-base font-light">
                      your proposal is ready to share
                    </p>
                  </div>

                  {/* Shareable link */}
                  <div>
                    <p className="text-sm text-white/40 font-sans font-light mb-2">shareable link:</p>
                    <div className="bg-white/5 p-3 rounded border border-white/10 flex items-center justify-between gap-3">
                      <span className="text-sm font-mono text-gold truncate">
                        {origin}{result.url}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(`${origin}${result.url}`)}
                        className="shrink-0 px-3 py-1.5 bg-white/5 border border-white/10 rounded text-white/50 hover:text-white font-sans text-xs transition-colors"
                      >
                        copy
                      </button>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-3 bg-white/5 border border-white/10 rounded text-white/70 hover:text-white hover:bg-white/10 font-sans text-sm font-medium transition-colors min-h-[44px] flex items-center justify-center"
                    >
                      preview proposal
                    </a>
                    <a
                      href={(() => {
                        const firstName = (result.clientName || '').split(' ')[0] || 'there'
                        const address = result.propertyAddress || 'your property'
                        const street = address.split(',')[0]?.trim() || address
                        const proposalLink = `${origin}${result.url}`
                        const subject = `Your Property Proposal — ${street}`
                        const body = `Dear ${firstName},

Thank you for the opportunity to present our proposal for the sale of ${street}. It was a pleasure meeting with you, and I truly appreciate the trust you've placed in Grant's Estate Agents.

I've prepared a personalised proposal that outlines our recommended approach, including our marketing strategy, comparable sales data, and the campaign structure designed to achieve the very best result for you.

You can view your proposal here:
${proposalLink}

The proposal is interactive — you can review each section at your own pace and, when you're ready, express your interest to proceed directly from the page.

If you have any questions at all, please don't hesitate to call me directly. I'm here to guide you through every step of the process.

I look forward to working with you.

Warm regards,

Stuart Grant
Principal — Berwick & Pakenham
Grant's Estate Agents
M: 0438 554 522
E: stuart@grantsea.com.au
W: grantsea.com.au`
                        return `mailto:${encodeURIComponent(result.clientEmail || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
                      })()}
                      className="px-5 py-3 bg-gold text-charcoal rounded font-sans text-sm font-medium hover:bg-gold-600 transition-colors min-h-[44px] flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                      send to vendor
                    </a>
                  </div>

                  {/* Create another */}
                  <button
                    type="button"
                    onClick={() => { setResult(null); setSendResult(null) }}
                    className="text-white/30 font-sans text-sm hover:text-white/50 transition-colors"
                  >
                    create another proposal
                  </button>
                </motion.div>
              ) : (
                <>
                  {/* Editing indicator */}
                  {editingProposalId && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-brand/10 border border-brand/20 rounded-lg mb-4">
                      <svg className="w-4 h-4 text-brand flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                      <span className="text-brand font-sans text-sm font-medium">editing existing proposal</span>
                    </div>
                  )}

                  {/* Draft indicator */}
                  <div className="flex items-center justify-between">
                    <p className="text-white/20 font-sans text-xs">
                      progress auto-saved
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        clearDraft()
                        setAddressValue('')
                        setHeroUploadUrl('')
                        setMarketingCosts(DEFAULT_MARKETING_COSTS)
                        formRef.current?.reset()
                        // Re-check the N/A radio after reset
                        setTimeout(() => {
                          const radios = formRef.current?.querySelectorAll<HTMLInputElement>('input[name="methodOfSale"]')
                          radios?.forEach(r => { r.checked = r.value === '' })
                        }, 50)
                      }}
                      className="text-white/20 hover:text-white/40 font-sans text-xs transition-colors"
                    >
                      clear form
                    </button>
                  </div>

                  <div>
                    <label htmlFor="clientName" className="block text-sm font-sans font-medium text-white/60 mb-2 lowercase">
                      client name
                    </label>
                    <input
                      type="text"
                      id="clientName"
                      name="clientName"
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded text-white font-sans placeholder-white/20 focus:ring-1 focus:ring-gold focus:border-gold text-base touch-manipulation transition-colors"
                      placeholder="John Smith"
                    />
                  </div>

                  <div>
                    <label htmlFor="clientEmail" className="block text-sm font-sans font-medium text-white/60 mb-2 lowercase">
                      client email
                    </label>
                    <input
                      type="email"
                      id="clientEmail"
                      name="clientEmail"
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded text-white font-sans placeholder-white/20 focus:ring-1 focus:ring-gold focus:border-gold text-base touch-manipulation transition-colors"
                      placeholder="john.smith@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="propertyAddress" className="block text-sm font-sans font-medium text-white/60 mb-2 lowercase">
                      property address
                    </label>
                    <input
                      type="text"
                      id="propertyAddress"
                      name="propertyAddress"
                      required
                      value={addressValue}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      onBlur={() => {
                        if (addressValue && isAddressComplete(addressValue)) {
                          fetchPropertyImages(addressValue)
                        }
                      }}
                      className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded text-white font-sans placeholder-white/20 focus:ring-1 focus:ring-gold focus:border-gold text-base touch-manipulation transition-colors"
                      placeholder="123 Main Street, Suburb VIC 3000"
                    />
                  </div>

                  {/* Auto-fetched property images */}
                  <AnimatePresence mode="wait">
                    {isFetchingImages && (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-3 py-4 px-4 bg-white/5 border border-white/10 rounded">
                          <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                          <p className="text-white/40 font-sans text-sm font-light">fetching property images...</p>
                        </div>
                      </motion.div>
                    )}

                    {!isFetchingImages && propertyImages && (
                      <motion.div
                        key="images"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 bg-white/5 border border-white/10 rounded space-y-4">
                          {/* Hero image preview */}
                          <div className="relative w-full max-h-[200px] overflow-hidden rounded shadow-md">
                            <img
                              src={propertyImages.heroImage}
                              alt="Property"
                              className="w-full h-full max-h-[200px] object-cover rounded"
                            />
                          </div>

                          {/* Gallery thumbnails */}
                          {propertyImages.galleryImages.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {propertyImages.galleryImages.slice(0, 6).map((img, i) => (
                                <div key={i} className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden shadow-sm">
                                  <img
                                    src={img}
                                    alt={`Gallery ${i + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                              {propertyImages.galleryImages.length > 6 && (
                                <div className="w-16 h-16 flex-shrink-0 rounded bg-white/10 flex items-center justify-center">
                                  <span className="text-white/40 text-xs font-sans">+{propertyImages.galleryImages.length - 6}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Toggle + source */}
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={useAutoImage}
                                  onChange={(e) => setUseAutoImage(e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-white/10 rounded-full peer-checked:bg-gold transition-colors duration-200" />
                                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-4" />
                              </div>
                              <span className="text-white/50 font-sans text-sm group-hover:text-white/70 transition-colors">
                                use this image
                              </span>
                            </label>
                            <span className="text-white/20 font-sans text-xs">
                              auto-fetched from realestate.com.au
                            </span>
                          </div>

                          {/* Hidden inputs to pass auto-fetched images with form */}
                          {useAutoImage && (
                            <>
                              <input type="hidden" name="autoHeroImage" value={propertyImages.heroImage} />
                              {propertyImages.galleryImages.map((img, i) => (
                                <input key={i} type="hidden" name="propertyImages" value={img} />
                              ))}
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Divider */}
                  <div className="border-t border-white/5 pt-8">
                    <p className="text-white/30 font-sans text-xs tracking-wider-custom mb-8">sale details</p>
                  </div>

                  {/* Method of Sale */}
                  <div>
                    <label className="block text-sm font-sans font-medium text-white/60 mb-3 lowercase">
                      method of sale
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {['Auction', 'Private Sale', 'Expressions of Interest'].map((method) => (
                        <label key={method} className="relative cursor-pointer">
                          <input
                            type="radio"
                            name="methodOfSale"
                            value={method}
                            className="sr-only peer"
                          />
                          <div className="px-5 py-3 rounded bg-white/5 border border-white/15 text-white/50 font-sans text-sm font-medium transition-all duration-200 peer-checked:bg-brand/20 peer-checked:border-brand peer-checked:text-white hover:bg-white/10 hover:text-white/70 min-h-[44px] flex items-center">
                            {method.toLowerCase()}
                          </div>
                        </label>
                      ))}
                      <label className="relative cursor-pointer">
                        <input
                          type="radio"
                          name="methodOfSale"
                          value=""
                          defaultChecked
                          className="sr-only peer"
                        />
                        <div className="px-5 py-3 rounded bg-white/5 border border-white/15 text-white/50 font-sans text-sm font-medium transition-all duration-200 peer-checked:bg-white/10 peer-checked:border-white/30 peer-checked:text-white/70 hover:bg-white/10 hover:text-white/70 min-h-[44px] flex items-center">
                          n/a
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Price Guide */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="priceGuideMin" className="block text-sm font-sans font-medium text-white/60 mb-2 lowercase">
                        price guide — low
                        <span className="text-white/30 text-xs ml-2">optional</span>
                      </label>
                      <input
                        type="number"
                        id="priceGuideMin"
                        name="priceGuideMin"
                        min="0"
                        step="10000"
                        className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded text-white font-sans placeholder-white/20 focus:ring-1 focus:ring-gold focus:border-gold text-base touch-manipulation transition-colors"
                        placeholder="800000"
                      />
                    </div>
                    <div>
                      <label htmlFor="priceGuideMax" className="block text-sm font-sans font-medium text-white/60 mb-2 lowercase">
                        price guide — high
                        <span className="text-white/30 text-xs ml-2">optional</span>
                      </label>
                      <input
                        type="number"
                        id="priceGuideMax"
                        name="priceGuideMax"
                        min="0"
                        step="10000"
                        className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded text-white font-sans placeholder-white/20 focus:ring-1 focus:ring-gold focus:border-gold text-base touch-manipulation transition-colors"
                        placeholder="900000"
                      />
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-white/5 pt-8">
                    <p className="text-white/30 font-sans text-xs tracking-wider-custom mb-8">property details</p>
                  </div>

                  {/* Hero image — upload or URL */}
                  <div>
                    <label className="block text-sm font-sans font-medium text-white/60 mb-2 lowercase">
                      hero image
                      <span className="text-white/30 text-xs ml-2">
                        {propertyImages && useAutoImage ? 'override — leave blank to use auto-fetched' : 'upload or paste URL'}
                      </span>
                    </label>

                    {/* Upload preview */}
                    {heroUploadUrl && (
                      <div className="mb-3 relative">
                        <div className="w-full max-h-[160px] overflow-hidden rounded shadow-md">
                          <img src={heroUploadUrl} alt="Hero preview" className="w-full h-full max-h-[160px] object-cover rounded" />
                        </div>
                        <button
                          type="button"
                          onClick={() => setHeroUploadUrl('')}
                          className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}

                    <div className="flex gap-3">
                      {/* File upload */}
                      <label className="flex-shrink-0 px-4 py-3 bg-white/5 border border-white/15 rounded text-white/50 hover:text-white/70 hover:bg-white/10 font-sans text-sm font-medium cursor-pointer transition-colors min-h-[44px] flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        {isUploadingHero ? 'uploading...' : 'upload'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          disabled={isUploadingHero}
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            setIsUploadingHero(true)
                            try {
                              const fd = new FormData()
                              fd.append('file', file)
                              const res = await fetch('/api/upload', { method: 'POST', body: fd })
                              const data = await res.json()
                              if (data.url) {
                                setHeroUploadUrl(data.url)
                              }
                            } catch {}
                            setIsUploadingHero(false)
                            e.target.value = ''
                          }}
                        />
                      </label>
                      {/* URL input */}
                      <input
                        type="url"
                        id="heroImage"
                        name="heroImage"
                        className="flex-1 px-4 py-3 bg-white/5 border border-white/15 rounded text-white font-sans placeholder-white/20 focus:ring-1 focus:ring-gold focus:border-gold text-base touch-manipulation transition-colors"
                        placeholder="or paste image URL"
                      />
                    </div>
                    {/* Pass uploaded hero image */}
                    {heroUploadUrl && (
                      <input type="hidden" name="heroImage" value={heroUploadUrl} />
                    )}
                  </div>

                  <div>
                    <label htmlFor="commissionRate" className="block text-sm font-sans font-medium text-white/60 mb-2 lowercase">
                      commission rate (%)
                      <span className="text-white/30 text-xs ml-2">defaults to agency config</span>
                    </label>
                    <input
                      type="number"
                      id="commissionRate"
                      name="commissionRate"
                      step="0.01"
                      min="0"
                      max="10"
                      className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded text-white font-sans placeholder-white/20 focus:ring-1 focus:ring-gold focus:border-gold text-base touch-manipulation transition-colors"
                      placeholder="1.45"
                    />
                  </div>

                  {/* Divider */}
                  <div className="border-t border-white/5 pt-8">
                    <p className="text-white/30 font-sans text-xs tracking-wider-custom mb-8">marketing costs</p>
                  </div>

                  {/* Marketing Costs Editor */}
                  <div className="space-y-3">
                    {marketingCosts.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-start">
                        {/* Category */}
                        <div className="col-span-12 sm:col-span-4">
                          <input
                            type="text"
                            value={item.category}
                            onChange={(e) => updateMarketingItem(index, 'category', e.target.value)}
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded text-white font-sans text-sm placeholder-white/20 focus:ring-1 focus:ring-gold focus:border-gold transition-colors"
                            placeholder="Item name"
                          />
                        </div>
                        {/* Description */}
                        <div className="col-span-12 sm:col-span-4">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateMarketingItem(index, 'description', e.target.value)}
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded text-white font-sans text-sm placeholder-white/20 focus:ring-1 focus:ring-gold focus:border-gold transition-colors"
                            placeholder="Description"
                          />
                        </div>
                        {/* Cost or Included toggle */}
                        <div className="col-span-6 sm:col-span-2">
                          {item.included ? (
                            <div className="px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400 font-sans text-sm text-center">
                              included
                            </div>
                          ) : (
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 font-sans text-sm">$</span>
                              <input
                                type="number"
                                value={item.cost || ''}
                                onChange={(e) => updateMarketingItem(index, 'cost', parseFloat(e.target.value) || 0)}
                                min="0"
                                step="10"
                                className="w-full pl-7 pr-3 py-2.5 bg-white/5 border border-white/15 rounded text-white font-sans text-sm placeholder-white/20 focus:ring-1 focus:ring-gold focus:border-gold transition-colors"
                                placeholder="0"
                              />
                            </div>
                          )}
                        </div>
                        {/* Included toggle + remove */}
                        <div className="col-span-6 sm:col-span-2 flex items-center gap-2">
                          <label className="flex items-center gap-1.5 cursor-pointer group flex-1">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={item.included}
                                onChange={(e) => updateMarketingItem(index, 'included', e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-8 h-4.5 bg-white/10 rounded-full peer-checked:bg-emerald-500 transition-colors duration-200" style={{ height: '18px' }} />
                              <div className="absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-3.5" style={{ width: '14px', height: '14px' }} />
                            </div>
                            <span className="text-white/40 font-sans text-xs group-hover:text-white/60 transition-colors whitespace-nowrap">
                              incl
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => removeMarketingItem(index)}
                            className="w-8 h-8 flex items-center justify-center text-white/20 hover:text-red-400 transition-colors rounded hover:bg-white/5"
                            aria-label="Remove item"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add item + total */}
                    <div className="flex items-center justify-between pt-4">
                      <button
                        type="button"
                        onClick={addMarketingItem}
                        className="flex items-center gap-2 text-white/40 hover:text-white/70 font-sans text-sm transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        add item
                      </button>
                      <div className="text-right">
                        <p className="text-white/40 font-sans text-xs mb-1">total campaign cost</p>
                        <p className="text-gold font-sans text-xl font-semibold">
                          ${marketingTotal.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Hidden input to pass marketing costs JSON */}
                  <input type="hidden" name="marketingCosts" value={JSON.stringify(marketingCosts)} />
                  <input type="hidden" name="marketingTotal" value={marketingTotal.toString()} />

                  {/* Divider */}
                  <div className="border-t border-white/5 pt-8">
                    <p className="text-white/30 font-sans text-xs tracking-wider-custom mb-8">comparable sales & listings</p>
                  </div>

                  {/* Search button */}
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-sans font-medium text-white/60 lowercase">
                      recent comparable sales
                    </p>
                    <button
                      type="button"
                      onClick={searchComparables}
                      disabled={isSearchingComps}
                      className="px-4 py-2 bg-white/5 border border-white/15 rounded text-white/60 hover:text-white hover:bg-white/10 font-sans text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-h-[36px] flex items-center gap-2"
                    >
                      {isSearchingComps ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                          searching...
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                          </svg>
                          auto-fill from address
                        </>
                      )}
                    </button>
                  </div>

                  {/* Search error/status */}
                  {compsError && (
                    <p className="text-amber-400/70 font-sans text-xs font-light mt-2">{compsError}</p>
                  )}

                  {/* Comparable sales — editable rows */}
                  <div className="space-y-2">
                    {compRows.map((row, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-start">
                        <div className="col-span-12 sm:col-span-4">
                          <input
                            type="text"
                            value={row.address}
                            onChange={(e) => updateCompRow(index, 'address', e.target.value)}
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded text-white font-sans text-sm placeholder-white/20 focus:ring-1 focus:ring-gold focus:border-gold transition-colors"
                            placeholder="Address"
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 font-sans text-sm">$</span>
                            <input
                              type="text"
                              value={row.price}
                              onChange={(e) => updateCompRow(index, 'price', e.target.value)}
                              className="w-full pl-7 pr-3 py-2.5 bg-white/5 border border-white/15 rounded text-white font-sans text-sm placeholder-white/20 focus:ring-1 focus:ring-gold focus:border-gold transition-colors"
                              placeholder="Price"
                            />
                          </div>
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                          <input
                            type="text"
                            value={row.date}
                            onChange={(e) => updateCompRow(index, 'date', e.target.value)}
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded text-white font-sans text-sm placeholder-white/20 focus:ring-1 focus:ring-gold focus:border-gold transition-colors"
                            placeholder="Date"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <input
                            type="text"
                            value={row.bedrooms}
                            onChange={(e) => updateCompRow(index, 'bedrooms', e.target.value)}
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded text-white font-sans text-sm placeholder-white/20 focus:ring-1 focus:ring-gold focus:border-gold transition-colors text-center"
                            placeholder="Bed"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <input
                            type="text"
                            value={row.bathrooms}
                            onChange={(e) => updateCompRow(index, 'bathrooms', e.target.value)}
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded text-white font-sans text-sm placeholder-white/20 focus:ring-1 focus:ring-gold focus:border-gold transition-colors text-center"
                            placeholder="Bath"
                          />
                        </div>
                        <div className="col-span-12 sm:col-span-2 flex items-center gap-1">
                          <input
                            type="text"
                            value={row.url}
                            onChange={(e) => updateCompRow(index, 'url', e.target.value)}
                            className="flex-1 px-3 py-2.5 bg-white/5 border border-white/15 rounded text-white font-sans text-sm placeholder-white/20 focus:ring-1 focus:ring-gold focus:border-gold transition-colors"
                            placeholder="URL"
                          />
                          <button
                            type="button"
                            onClick={() => removeCompRow(index)}
                            className="w-8 h-8 flex items-center justify-center text-white/20 hover:text-red-400 transition-colors rounded hover:bg-white/5 flex-shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addCompRow}
                      className="flex items-center gap-2 text-white/40 hover:text-white/70 font-sans text-sm transition-colors pt-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      add sale
                    </button>
                  </div>

                  {/* On-market listings — editable rows */}
                  <div className="mt-8">
                    <p className="text-sm font-sans font-medium text-white/60 lowercase mb-4">
                      currently on market
                    </p>
                    <div className="space-y-2">
                      {onMarketRows.map((row, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-start">
                          <div className="col-span-12 sm:col-span-4">
                            <input
                              type="text"
                              value={row.address}
                              onChange={(e) => updateOnMarketRow(index, 'address', e.target.value)}
                              className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded text-white font-sans text-sm placeholder-white/20 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                              placeholder="Address"
                            />
                          </div>
                          <div className="col-span-4 sm:col-span-2">
                            <input
                              type="text"
                              value={row.askingPrice}
                              onChange={(e) => updateOnMarketRow(index, 'askingPrice', e.target.value)}
                              className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded text-white font-sans text-sm placeholder-white/20 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                              placeholder="Asking price"
                            />
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <input
                              type="text"
                              value={row.bedrooms}
                              onChange={(e) => updateOnMarketRow(index, 'bedrooms', e.target.value)}
                              className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded text-white font-sans text-sm placeholder-white/20 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-center"
                              placeholder="Bed"
                            />
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <input
                              type="text"
                              value={row.bathrooms}
                              onChange={(e) => updateOnMarketRow(index, 'bathrooms', e.target.value)}
                              className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded text-white font-sans text-sm placeholder-white/20 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-center"
                              placeholder="Bath"
                            />
                          </div>
                          <div className="col-span-4 sm:col-span-2">
                            <input
                              type="text"
                              value={row.propertyType}
                              onChange={(e) => updateOnMarketRow(index, 'propertyType', e.target.value)}
                              className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded text-white font-sans text-sm placeholder-white/20 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                              placeholder="Type"
                            />
                          </div>
                          <div className="col-span-12 sm:col-span-2 flex items-center gap-1">
                            <input
                              type="text"
                              value={row.url}
                              onChange={(e) => updateOnMarketRow(index, 'url', e.target.value)}
                              className="flex-1 px-3 py-2.5 bg-white/5 border border-white/15 rounded text-white font-sans text-sm placeholder-white/20 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                              placeholder="URL"
                            />
                            <button
                              type="button"
                              onClick={() => removeOnMarketRow(index)}
                              className="w-8 h-8 flex items-center justify-center text-white/20 hover:text-red-400 transition-colors rounded hover:bg-white/5 flex-shrink-0"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addOnMarketRow}
                        className="flex items-center gap-2 text-white/40 hover:text-white/70 font-sans text-sm transition-colors pt-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        add listing
                      </button>
                    </div>
                  </div>

                  {/* Hidden inputs */}
                  <input type="hidden" name="selectedComps" value={JSON.stringify(compRows.filter(r => r.address).map(r => ({
                    address: r.address,
                    price: parseInt(r.price.replace(/[^0-9]/g, '')) || 0,
                    date: r.date,
                    bedrooms: parseInt(r.bedrooms) || 0,
                    bathrooms: parseInt(r.bathrooms) || 0,
                    sqft: 0,
                    distance: 0,
                    url: r.url,
                  })))} />
                  <input type="hidden" name="selectedOnMarket" value={JSON.stringify(onMarketRows.filter(r => r.address).map(r => ({
                    address: r.address,
                    askingPrice: r.askingPrice,
                    bedrooms: parseInt(r.bedrooms) || 0,
                    bathrooms: parseInt(r.bathrooms) || 0,
                    cars: 0,
                    propertyType: r.propertyType,
                    url: r.url,
                  })))} />

                  {/* Error */}
                  {result && !result.success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 rounded bg-white/5 border border-white/10"
                    >
                      <p className="font-sans font-medium text-white/60">{result.error}</p>
                    </motion.div>
                  )}

                  <div className="flex items-center gap-4">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      isLoading={isSubmitting}
                      className="w-auto"
                    >
                      {editingProposalId ? 'update proposal' : 'create proposal'}
                    </Button>
                    {editingProposalId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProposalId(null)
                          formRef.current?.reset()
                          setAddressValue('')
                          setHeroUploadUrl('')
                          setMarketingCosts(DEFAULT_MARKETING_COSTS)
                          setCompRows([])
                          setOnMarketRows([])
                          clearDraft()
                        }}
                        className="text-white/30 hover:text-white/50 font-sans text-sm transition-colors"
                      >
                        cancel edit
                      </button>
                    )}
                  </div>
                </>
              )}
            </form>
          </div>

          {/* Footer note */}
          <div className="mt-12 text-left mb-16">
            <p className="text-sm text-white/20 font-sans font-light">
              proposals include sale process, marketing plan, and comparable sales data.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

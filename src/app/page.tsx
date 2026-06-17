'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { WizardLayout, clearDraft } from '@/components/Wizard'
import ClientDetailsStep, { validateClientDetails } from '@/components/Wizard/steps/ClientDetailsStep'
import PropertySaleStep, { validatePropertySale } from '@/components/Wizard/steps/PropertySaleStep'
import PropertyRentalStep, { validatePropertyRental } from '@/components/Wizard/steps/PropertyRentalStep'
import MarketingStep, { validateMarketing } from '@/components/Wizard/steps/MarketingStep'
import type { MarketingCostItem } from '@/components/Wizard/steps/MarketingStep'
import SoldPropertiesStep, { validateSoldProperties } from '@/components/Wizard/steps/SoldPropertiesStep'
import type { ComparableRow } from '@/components/Wizard/steps/SoldPropertiesStep'
import ForSalePropertiesStep from '@/components/Wizard/steps/ForSalePropertiesStep'
import ReviewGenerateStep from '@/components/Wizard/steps/ReviewGenerateStep'
import { reacomPremiereForSuburb, suburbLabelForPremiere, REACOM_PREMIERE_RATE_VALUES } from '@/lib/marketing-plan'

// ─── Step icon SVGs (inline, no library) ───────────────────────────────────

function UserIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  )
}
function HomeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}
function MegaphoneIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  )
}
function ListingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
    </svg>
  )
}
function CheckCircleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

// ─── Step definitions ──────────────────────────────────────────────────────

const SALE_STEPS = [
  { id: 'client', title: 'Client Details', icon: <UserIcon />, description: 'Vendor information' },
  { id: 'property', title: 'Property & Sale', icon: <HomeIcon />, description: 'Sale method & pricing' },
  { id: 'marketing', title: 'Marketing', icon: <MegaphoneIcon />, description: 'Advertising schedule' },
  { id: 'sold', title: 'Sold Properties', icon: <SearchIcon />, description: 'Comparable sales' },
  { id: 'forsale', title: 'For Sale', icon: <ListingsIcon />, description: 'On-market listings' },
  { id: 'review', title: 'Review & Generate', icon: <CheckCircleIcon />, description: 'Final review' },
]

const RENTAL_STEPS = [
  { id: 'client', title: 'Client Details', icon: <UserIcon />, description: 'Landlord information' },
  { id: 'property', title: 'Property & Rental', icon: <HomeIcon />, description: 'Rental terms & fees' },
  { id: 'marketing', title: 'Marketing', icon: <MegaphoneIcon />, description: 'Advertising schedule' },
  { id: 'leased', title: 'Leased Properties', icon: <SearchIcon />, description: 'Comparable rentals' },
  { id: 'forrent', title: 'For Rent', icon: <ListingsIcon />, description: 'Available rentals' },
  { id: 'review', title: 'Review & Generate', icon: <CheckCircleIcon />, description: 'Final review' },
]

// ─── Default marketing costs ──────────────────────────────────────────────
// Figures from Grant's REA rate card (Re.Com premiere listings + Central signs
// + Aleisha auctioneer + Complete Image photography), effective 1 July 2025.
//
// REA premiere listing (4-week) varies by suburb:
//   $2760  Berwick, Beaconsfield, Narre Warren N/Nth/Sth, Hallam, Cranbourne, Cranbourne Nth
//   $2540  Pakenham / Pakenham Upper, Officer
//   $1580  Clyde, Clyde North, Cardinia
//   $1380  Nyora, Tynong, Tynong North, Nar Nar Goon (Nth), Maryknoll, Garfield, Koo Wee Rup
//   $1310  Drouin (Sth/East/West)
// Defaults below use the Berwick rate ($2760); the premiere line auto-adjusts to
// the property's suburb (see reacomPremiereForSuburb) unless the user edits it.

const DEFAULT_RENTAL_MARKETING_COSTS: MarketingCostItem[] = [
  { category: 'Internet', description: 'Premiere Rental Listing — realestate.com.au (highlighted rental listing)', cost: 0, included: true },
  { category: 'Photography', description: 'Standard Rental Shoot — Complete Image (10 images)', cost: 150, included: false },
  { category: 'Signboard', description: 'Lease signboard — 3 x 7 Central sign', cost: 60, included: false },
  { category: 'Internet', description: 'Social Media Campaign — targeted Facebook and Instagram campaign', cost: 0, included: true },
  { category: 'Other', description: 'Open Home Inspections — weekly open for inspection sessions', cost: 0, included: true },
]

const DEFAULT_MARKETING_COSTS: MarketingCostItem[] = [
  { category: 'Internet', description: 'Premiere Listing — realestate.com.au (4 week premiere listing — Berwick)', cost: 2760, included: false },
  { category: 'Photography', description: 'Complete Image — Sales Day Shoot (20 images), 2D floor plan, site plan & drone', cost: 550, included: false },
  { category: 'Signboard', description: 'Central signboard — 4 x 8 stock board', cost: 100, included: false },
  { category: 'Internet', description: 'Internet Listings — domain.com and 4 other portals', cost: 0, included: true },
  { category: 'Internet', description: 'Social Media Campaign — Targeted Facebook and Instagram campaign', cost: 0, included: true },
  { category: 'Print', description: 'Brochures — Premium property brochures for open homes', cost: 150, included: false },
  { category: 'Styling', description: 'Digital Staging — virtual furniture', cost: 200, included: false },
  { category: 'Styling', description: 'Home Staging — full property styling & furniture hire', cost: 4500, included: false },
  { category: 'Auctioneer', description: 'Auctioneer — Aleisha (professional auctioneer services)', cost: 700, included: false },
  { category: 'Other', description: 'Window Cards — Office window card display', cost: 0, included: true },
  { category: 'Other', description: 'Open Homes — Weekly open home inspections', cost: 0, included: true },
]

// ─── Interfaces ────────────────────────────────────────────────────────────

interface PropertyImages {
  heroImage: string
  galleryImages: string[]
}

interface RecentProposal {
  id: string
  clientName: string
  propertyAddress: string
  proposalDate: string
  status: string
  methodOfSale?: string
  priceGuide?: { min: number; max: number }
  fees?: { commissionRate: number }
  createdAt?: string
}

// ─── Draft key ─────────────────────────────────────────────────────────────

const WIZARD_DRAFT_KEY = 'gea-wizard-draft'

// ═══════════════════════════════════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════════════════════════════════

export default function HomePage() {
  // ── Wizard step ──────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0)

  // ── Step 1: Client Details state ─────────────────────────────────────────
  const [proposalType, setProposalType] = useState<'sale' | 'rental'>('sale')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [recentProposals, setRecentProposals] = useState<RecentProposal[]>([])
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null)

  // ── Step 2: Property & Rental state ─────────────────────────────────────
  const [askingRent, setAskingRent] = useState('')
  const [leaseType, setLeaseType] = useState('')
  const [availableDate, setAvailableDate] = useState('')
  const [managementFee, setManagementFee] = useState('')
  const [lettingFee, setLettingFee] = useState('')

  // ── Step 2: Property & Sale state ────────────────────────────────────────
  const [methodOfSale, setMethodOfSale] = useState('')
  const [priceGuideMin, setPriceGuideMin] = useState('')
  const [priceGuideMax, setPriceGuideMax] = useState('')
  const [heroImage, setHeroImage] = useState<File | null>(null)
  const [heroImageUrl, setHeroImageUrl] = useState('')
  const [commission, setCommission] = useState('')
  const [showPriceRange, setShowPriceRange] = useState(true)
  const [showCommission, setShowCommission] = useState(true)
  // Dual target campaign (development site) — KTD 2c: state persists when toggled off
  const [dualCampaign, setDualCampaign] = useState(false)
  const [devMethodOfSale, setDevMethodOfSale] = useState('Expressions of Interest')
  const [devPriceGuideMin, setDevPriceGuideMin] = useState('')
  const [devPriceGuideMax, setDevPriceGuideMax] = useState('')
  const [devShowPriceRange, setDevShowPriceRange] = useState(true)
  const [devMarketingCosts, setDevMarketingCosts] = useState<MarketingCostItem[]>([])
  // Subject property photos — populated only from the everypropertyAI lookup
  // (ClientDetailsStep "look up property from everyproperty"). No REA scraping.
  const [propertyImages, setPropertyImages] = useState<PropertyImages | null>(null)
  const [selectedAutoImageUrl, setSelectedAutoImageUrl] = useState('')

  // ── Step 3: Marketing state ──────────────────────────────────────────────
  const [marketingCosts, setMarketingCosts] = useState<MarketingCostItem[]>(DEFAULT_MARKETING_COSTS)

  // ── Step 4: Sold Comparables state ───────────────────────────────────────
  const [soldComparables, setSoldComparables] = useState<ComparableRow[]>([])

  // ── Step 5: On-Market Listings state ─────────────────────────────────────
  const [onMarketListings, setOnMarketListings] = useState<ComparableRow[]>([])

  // ── Shared address state between steps 4 and 5 ──────────────────────────
  const [confirmedAddress, setConfirmedAddress] = useState('')
  const [subjectLat, setSubjectLat] = useState<number | null>(null)
  const [subjectLng, setSubjectLng] = useState<number | null>(null)

  // ── Step 6: Review & Generate state ──────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{
    success: boolean; url?: string; id?: string; error?: string;
    clientName?: string; clientEmail?: string; propertyAddress?: string
  } | null>(null)
  const [origin, setOrigin] = useState('')
  const submittingRef = useRef(false)

  // ─── Dynamic step list ────────────────────────────────────────────────────
  const steps = useMemo(() => proposalType === 'rental' ? RENTAL_STEPS : SALE_STEPS, [proposalType])

  // ═══════════════════════════════════════════════════════════════════════════
  // Derived values
  // ═══════════════════════════════════════════════════════════════════════════

  const marketingTotal = marketingCosts
    .filter(item => !item.included)
    .reduce((sum, item) => sum + item.cost, 0)

  const devMarketingTotal = devMarketingCosts
    .filter(item => !item.included)
    .reduce((sum, item) => sum + item.cost, 0)

  const autoImageUrls = useMemo(() => {
    if (!propertyImages) return []
    return [propertyImages.heroImage, ...propertyImages.galleryImages]
  }, [propertyImages])

  // ─── Auto-adjust REA premiere listing cost to the property's suburb ─────────
  // Only touches the premiere line, and only when the user hasn't edited it
  // (its cost still equals a known rate-card value).
  useEffect(() => {
    if (proposalType === 'rental') return
    const rate = reacomPremiereForSuburb(propertyAddress)
    const label = suburbLabelForPremiere(propertyAddress) || 'Berwick'

    let changed = false
    const next = marketingCosts.map((item) => {
      if (!item.description.startsWith('Premiere Listing — realestate.com.au')) return item
      // Don't clobber a custom cost the user typed in.
      if (!REACOM_PREMIERE_RATE_VALUES.includes(Number(item.cost))) return item
      const newDescription = item.description.replace(
        /—\s*[^—)]+\)\s*$/,
        `— ${label})`
      )
      if (Number(item.cost) === rate && newDescription === item.description) return item
      changed = true
      return { ...item, cost: rate, description: newDescription }
    })
    if (changed) setMarketingCosts(next)
  }, [propertyAddress, proposalType, marketingCosts])

  // ═══════════════════════════════════════════════════════════════════════════
  // Init: origin, recent proposals, ?edit= param
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    setOrigin(window.location.origin)

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

  // Load proposal for editing from URL ?edit=ID
  const editLoadedRef = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const editId = params.get('edit')
    if (editId && !editLoadedRef.current) {
      editLoadedRef.current = true
      setTimeout(() => {
        handleEdit(editId)
      }, 300)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════════════════════════════════════════════════════════════════════════
  // Draft persistence (integrated with WizardLayout)
  // ═══════════════════════════════════════════════════════════════════════════

  const wizardFormData = useMemo(() => ({
    proposalType,
    clientName,
    clientEmail,
    propertyAddress,
    methodOfSale,
    priceGuideMin,
    priceGuideMax,
    heroImageUrl,
    commission,
    showPriceRange,
    showCommission,
    askingRent,
    leaseType,
    availableDate,
    managementFee,
    lettingFee,
    marketingCosts,
    dualCampaign,
    devMethodOfSale,
    devPriceGuideMin,
    devPriceGuideMax,
    devShowPriceRange,
    devMarketingCosts,
    editingProposalId,
  }), [proposalType, clientName, clientEmail, propertyAddress, methodOfSale, priceGuideMin, priceGuideMax, heroImageUrl, commission, showPriceRange, showCommission, askingRent, leaseType, availableDate, managementFee, lettingFee, marketingCosts, dualCampaign, devMethodOfSale, devPriceGuideMin, devPriceGuideMax, devShowPriceRange, devMarketingCosts, editingProposalId])

  const handleRestoreDraft = useCallback((data: { step: number; formData: Record<string, unknown> }) => {
    const d = data.formData
    if (d.proposalType) setProposalType(d.proposalType as 'sale' | 'rental')
    if (d.clientName) setClientName(d.clientName as string)
    if (d.clientEmail) setClientEmail(d.clientEmail as string)
    if (d.propertyAddress) setPropertyAddress(d.propertyAddress as string)
    if (d.methodOfSale !== undefined) setMethodOfSale(d.methodOfSale as string)
    if (d.priceGuideMin) setPriceGuideMin(d.priceGuideMin as string)
    if (d.priceGuideMax) setPriceGuideMax(d.priceGuideMax as string)
    if (d.heroImageUrl) setHeroImageUrl(d.heroImageUrl as string)
    if (d.commission) setCommission(d.commission as string)
    if (d.showPriceRange !== undefined) setShowPriceRange(d.showPriceRange as boolean)
    if (d.showCommission !== undefined) setShowCommission(d.showCommission as boolean)
    if (d.askingRent) setAskingRent(d.askingRent as string)
    if (d.leaseType) setLeaseType(d.leaseType as string)
    if (d.availableDate) setAvailableDate(d.availableDate as string)
    if (d.managementFee) setManagementFee(d.managementFee as string)
    if (d.lettingFee) setLettingFee(d.lettingFee as string)
    if (d.marketingCosts && Array.isArray(d.marketingCosts)) setMarketingCosts(d.marketingCosts as MarketingCostItem[])
    if (d.dualCampaign !== undefined) setDualCampaign(d.dualCampaign as boolean)
    if (d.devMethodOfSale) setDevMethodOfSale(d.devMethodOfSale as string)
    if (d.devPriceGuideMin) setDevPriceGuideMin(d.devPriceGuideMin as string)
    if (d.devPriceGuideMax) setDevPriceGuideMax(d.devPriceGuideMax as string)
    if (d.devShowPriceRange !== undefined) setDevShowPriceRange(d.devShowPriceRange as boolean)
    if (d.devMarketingCosts && Array.isArray(d.devMarketingCosts)) setDevMarketingCosts(d.devMarketingCosts as MarketingCostItem[])
    if (d.editingProposalId) setEditingProposalId(d.editingProposalId as string)
    setCurrentStep(data.step)
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // Load / edit / duplicate proposal handlers
  // ═══════════════════════════════════════════════════════════════════════════

  const handleEdit = async (proposalId: string) => {
    try {
      const res = await fetch(`/api/proposals?id=${proposalId}`)
      const proposal = await res.json()
      if (!proposal || proposal.error) return

      setEditingProposalId(proposalId)
      setResult(null)
      setCurrentStep(0)

      // Pre-fill all state
      setProposalType((proposal.proposalType as 'sale' | 'rental') || 'sale')
      setClientName(proposal.clientName || '')
      setClientEmail(proposal.clientEmail || '')
      setPropertyAddress(proposal.propertyAddress || '')
      setMethodOfSale(proposal.methodOfSale || '')
      setPriceGuideMin(proposal.priceGuide?.min ? String(proposal.priceGuide.min) : '')
      setPriceGuideMax(proposal.priceGuide?.max ? String(proposal.priceGuide.max) : '')
      setCommission(proposal.fees?.commissionRate ? String(proposal.fees.commissionRate) : '')
      setShowPriceRange(proposal.showPriceRange !== false)
      setShowCommission(proposal.showCommission !== false)
      if (proposal.askingRent) setAskingRent(String(proposal.askingRent))
      if (proposal.leaseType) setLeaseType(proposal.leaseType)
      if (proposal.availableDate) setAvailableDate(proposal.availableDate)
      if (proposal.managementFee != null) setManagementFee(String(proposal.managementFee))
      if (proposal.lettingFee) setLettingFee(proposal.lettingFee)
      if (proposal.heroImage) setHeroImageUrl(proposal.heroImage)

      // Pre-fill dual campaign — dev items come from the persisted raw list
      // (dev_marketing_costs), never reconstructed from the schedule
      setDualCampaign(proposal.dualCampaign === true)
      setDevMethodOfSale(proposal.devMethodOfSale || 'Expressions of Interest')
      setDevPriceGuideMin(proposal.devPriceGuide?.min ? String(proposal.devPriceGuide.min) : '')
      setDevPriceGuideMax(proposal.devPriceGuide?.max ? String(proposal.devPriceGuide.max) : '')
      setDevShowPriceRange(proposal.devShowPriceRange !== false)
      setDevMarketingCosts(Array.isArray(proposal.devMarketingCosts) ? proposal.devMarketingCosts : [])

      // Pre-fill marketing costs
      if (proposal.advertisingSchedule) {
        const items: MarketingCostItem[] = []
        for (const week of proposal.advertisingSchedule) {
          for (const act of week.activities) {
            if (week.week > 1 && act.included) continue
            items.push({
              category: act.category || 'Other',
              description: act.description,
              cost: act.cost || 0,
              included: !!act.included,
            })
          }
        }
        if (items.length > 0) setMarketingCosts(items)
      }

      // Pre-fill comparables (convert to ComparableRow format)
      if (proposal.recentSales?.length > 0) {
        setSoldComparables(proposal.recentSales.map((s: any) => ({
          address: s.address || '',
          price: s.price ? String(s.price) : '',
          beds: s.bedrooms ? String(s.bedrooms) : '',
          baths: s.bathrooms ? String(s.bathrooms) : '',
          cars: s.cars ? String(s.cars) : '0',
          date: s.date || '',
          propertyType: s.propertyType || 'House',
          url: s.url || '',
          imageUrl: s.imageUrl || '',
          included: true,
        })))
      }

      if (proposal.onMarketListings?.length > 0) {
        setOnMarketListings(proposal.onMarketListings.map((s: any) => ({
          address: s.address || '',
          price: s.askingPrice || '',
          beds: s.bedrooms ? String(s.bedrooms) : '',
          baths: s.bathrooms ? String(s.bathrooms) : '',
          cars: s.cars ? String(s.cars) : '0',
          propertyType: s.propertyType || 'House',
          url: s.url || '',
          imageUrl: s.imageUrl || '',
          included: true,
        })))
      }
    } catch {}
  }

  const handleDuplicate = async (proposalId: string) => {
    try {
      const res = await fetch(`/api/proposals?id=${proposalId}`)
      const proposal = await res.json()
      if (!proposal || proposal.error) return

      setEditingProposalId(null)
      setResult(null)
      setCurrentStep(0)

      // Pre-fill but clear identity fields for new proposal
      setClientName('')
      setClientEmail('')
      setPropertyAddress('')
      setMethodOfSale(proposal.methodOfSale || '')
      setPriceGuideMin(proposal.priceGuide?.min ? String(proposal.priceGuide.min) : '')
      setPriceGuideMax(proposal.priceGuide?.max ? String(proposal.priceGuide.max) : '')
      setCommission(proposal.fees?.commissionRate ? String(proposal.fees.commissionRate) : '')
      setShowPriceRange(proposal.showPriceRange !== false)
      setShowCommission(proposal.showCommission !== false)

      setDualCampaign(proposal.dualCampaign === true)
      setDevMethodOfSale(proposal.devMethodOfSale || 'Expressions of Interest')
      setDevPriceGuideMin(proposal.devPriceGuide?.min ? String(proposal.devPriceGuide.min) : '')
      setDevPriceGuideMax(proposal.devPriceGuide?.max ? String(proposal.devPriceGuide.max) : '')
      setDevShowPriceRange(proposal.devShowPriceRange !== false)
      setDevMarketingCosts(Array.isArray(proposal.devMarketingCosts) ? proposal.devMarketingCosts : [])

      if (proposal.advertisingSchedule) {
        const items: MarketingCostItem[] = []
        for (const week of proposal.advertisingSchedule) {
          for (const act of week.activities) {
            if (week.week > 1 && act.included) continue
            items.push({
              category: act.category || 'Other',
              description: act.description,
              cost: act.cost || 0,
              included: !!act.included,
            })
          }
        }
        if (items.length > 0) setMarketingCosts(items)
      }
    } catch {}
  }

  const handleDeleteProposal = async (id: string) => {
    try {
      const res = await fetch(`/api/proposals?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setRecentProposals(prev => prev.filter(rp => rp.id !== id))
      }
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Confirmed address callback from SoldPropertiesStep
  // ═══════════════════════════════════════════════════════════════════════════

  const handleConfirmAddress = useCallback((address: string, lat: number | null, lng: number | null) => {
    setConfirmedAddress(address)
    setSubjectLat(lat)
    setSubjectLng(lng)
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // Form submission (build FormData programmatically from React state)
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSubmit = async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    setIsSubmitting(true)
    setResult(null)

    const formData = new FormData()

    // Step 1 fields
    formData.append('proposalType', proposalType)
    formData.append('clientName', clientName)
    formData.append('clientEmail', clientEmail)
    formData.append('propertyAddress', propertyAddress)

    // Step 2 fields
    if (proposalType === 'rental') {
      if (askingRent) formData.append('askingRent', askingRent)
      if (leaseType) formData.append('leaseType', leaseType)
      if (availableDate) formData.append('availableDate', availableDate)
      if (managementFee) formData.append('managementFee', managementFee)
      if (lettingFee) formData.append('lettingFee', lettingFee)
    }
    formData.append('methodOfSale', methodOfSale)
    if (priceGuideMin) formData.append('priceGuideMin', priceGuideMin)
    if (priceGuideMax) formData.append('priceGuideMax', priceGuideMax)
    if (commission) formData.append('commissionRate', commission)
    formData.append('showPriceRange', showPriceRange ? '1' : '0')
    formData.append('showCommission', showCommission ? '1' : '0')
    if (heroImageUrl) formData.append('heroImage', heroImageUrl)
    if (heroImage) formData.append('heroImageFile', heroImage)

    // Auto-fetched images — use user-selected image if they picked one from the gallery
    if (propertyImages) {
      const autoHero = selectedAutoImageUrl || propertyImages.heroImage
      formData.append('autoHeroImage', autoHero)
      propertyImages.galleryImages.forEach(img => {
        formData.append('propertyImages[]', img)
      })
    }

    // Dual target campaign — always submitted; server ignores when dualCampaign=0 (KTD 2c)
    formData.append('dualCampaign', dualCampaign && proposalType !== 'rental' ? '1' : '0')
    formData.append('devMethodOfSale', devMethodOfSale)
    if (devPriceGuideMin) formData.append('devPriceGuideMin', devPriceGuideMin)
    if (devPriceGuideMax) formData.append('devPriceGuideMax', devPriceGuideMax)
    formData.append('devShowPriceRange', devShowPriceRange ? '1' : '0')
    formData.append('devMarketingCosts', JSON.stringify(devMarketingCosts))
    formData.append('devMarketingTotal', devMarketingTotal.toString())

    // Step 3 fields
    formData.append('marketingCosts', JSON.stringify(marketingCosts))
    formData.append('marketingTotal', marketingTotal.toString())

    // Step 4 fields — convert ComparableRow format to API format
    // Only include rows explicitly marked as included (strict === true check)
    const includedSold = soldComparables.filter(r => r.address && r.included === true)
    console.log(`[wizard] Submitting ${includedSold.length} sold (of ${soldComparables.length} total)`)
    formData.append('selectedComps', JSON.stringify(includedSold.map(r => ({
      address: r.address,
      price: parseInt(r.price.replace(/[^0-9]/g, '')) || 0,
      date: r.date || '',
      bedrooms: parseInt(r.beds) || 0,
      bathrooms: parseInt(r.baths) || 0,
      sqft: 0,
      distance: r.distance ? parseFloat(r.distance) : 0,
      url: r.url || '',
      imageUrl: r.imageUrl || '',
      tier: r.tier,
    }))))
    const includedOnMarket = onMarketListings.filter(r => r.address && r.included === true)
    console.log(`[wizard] Submitting ${includedOnMarket.length} on-market (of ${onMarketListings.length} total)`)
    formData.append('selectedOnMarket', JSON.stringify(includedOnMarket.map(r => ({
      address: r.address,
      askingPrice: r.price,
      bedrooms: parseInt(r.beds) || 0,
      bathrooms: parseInt(r.baths) || 0,
      cars: parseInt(r.cars || '0') || 0,
      propertyType: r.propertyType || 'House',
      url: r.url || '',
      imageUrl: r.imageUrl || '',
    }))))

    // Signal that comparables were explicitly handled (even if none selected)
    // This prevents the API from auto-looking up comparables
    formData.append('comparablesHandled', 'true')

    // Editing
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
          clientName,
          clientEmail,
          propertyAddress,
        })
        clearDraft(WIZARD_DRAFT_KEY)
        // Refresh recent proposals
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

  const resetForm = useCallback(() => {
    setProposalType('sale')
    setClientName('')
    setClientEmail('')
    setPropertyAddress('')
    setMethodOfSale('')
    setPriceGuideMin('')
    setPriceGuideMax('')
    setHeroImage(null)
    setHeroImageUrl('')
    setCommission('')
    setShowPriceRange(true)
    setShowCommission(true)
    setPropertyImages(null)
    setSelectedAutoImageUrl('')
    setAskingRent('')
    setLeaseType('')
    setAvailableDate('')
    setManagementFee('')
    setLettingFee('')
    setMarketingCosts(DEFAULT_MARKETING_COSTS)
    setDualCampaign(false)
    setDevMethodOfSale('Expressions of Interest')
    setDevPriceGuideMin('')
    setDevPriceGuideMax('')
    setDevShowPriceRange(true)
    setDevMarketingCosts([])
    setSoldComparables([])
    setOnMarketListings([])
    setConfirmedAddress('')
    setSubjectLat(null)
    setSubjectLng(null)
    setEditingProposalId(null)
    setCurrentStep(0)
    if (window.location.search.includes('edit=')) {
      window.history.replaceState({}, '', '/')
    }
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // Step validation
  // ═══════════════════════════════════════════════════════════════════════════

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0:
        return !validateClientDetails({ clientName, clientEmail, propertyAddress, proposalType })
      case 1:
        if (proposalType === 'rental') {
          return !validatePropertyRental({
            askingRent, leaseType, availableDate, managementFee, lettingFee,
            heroImage, heroImageUrl, propertyAddress,
          })
        }
        return !validatePropertySale({
          methodOfSale, priceGuideMin, priceGuideMax,
          heroImage, heroImageUrl, commission, showPriceRange, showCommission, propertyAddress,
          dualCampaign, devMethodOfSale, devPriceGuideMin, devPriceGuideMax, devShowPriceRange,
        })
      case 2:
        if (validateMarketing(marketingCosts)) return false
        // Dual campaign needs at least one dev item with a description
        if (dualCampaign && proposalType !== 'rental') {
          return devMarketingCosts.length > 0 && devMarketingCosts.every(i => i.description.trim())
        }
        return true
      case 3:
        if (proposalType === 'rental') return true // leased comparables are optional
        return !validateSoldProperties(soldComparables)
      case 4:
        return true // on-market is optional
      case 5:
        return true // review step
      default:
        return true
    }
  }, [currentStep, proposalType, clientName, clientEmail, propertyAddress, methodOfSale, priceGuideMin, priceGuideMax, heroImage, heroImageUrl, commission, askingRent, leaseType, availableDate, managementFee, lettingFee, marketingCosts, soldComparables, dualCampaign, devMethodOfSale, devPriceGuideMin, devPriceGuideMax, devShowPriceRange, devMarketingCosts])

  // ═══════════════════════════════════════════════════════════════════════════
  // Step field change handler (for ClientDetailsStep and PropertySaleStep)
  // ═══════════════════════════════════════════════════════════════════════════

  const handleFieldChange = useCallback((field: string, value: any) => {
    switch (field) {
      case 'proposalType':
        setProposalType(value)
        setMarketingCosts(value === 'rental' ? DEFAULT_RENTAL_MARKETING_COSTS : DEFAULT_MARKETING_COSTS)
        setSoldComparables([])
        setOnMarketListings([])
        break
      case 'clientName': setClientName(value); break
      case 'clientEmail': setClientEmail(value); break
      case 'propertyAddress': setPropertyAddress(value); break
      case 'methodOfSale': setMethodOfSale(value); break
      case 'priceGuideMin': setPriceGuideMin(value); break
      case 'priceGuideMax': setPriceGuideMax(value); break
      case 'heroImage': setHeroImage(value); break
      case 'heroImageUrl': setHeroImageUrl(value); break
      case 'commission': setCommission(value); break
      case 'showPriceRange': setShowPriceRange(value); break
      case 'showCommission': setShowCommission(value); break
      case 'dualCampaign': setDualCampaign(value); break
      case 'devMethodOfSale': setDevMethodOfSale(value); break
      case 'devPriceGuideMin': setDevPriceGuideMin(value); break
      case 'devPriceGuideMax': setDevPriceGuideMax(value); break
      case 'devShowPriceRange': setDevShowPriceRange(value); break
      case 'selectedAutoImageUrl': setSelectedAutoImageUrl(value); break
      // Full subject-property photo set from the everypropertyAI lookup
      case 'propertyImages': setPropertyImages(value); break
      case 'askingRent': setAskingRent(value); break
      case 'leaseType': setLeaseType(value); break
      case 'availableDate': setAvailableDate(value); break
      case 'managementFee': setManagementFee(value); break
      case 'lettingFee': setLettingFee(value); break
    }
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // New proposal handler (called from ReviewGenerateStep success state)
  // ═══════════════════════════════════════════════════════════════════════════

  const handleNewProposal = useCallback(() => {
    resetForm()
    setResult(null)
    setCurrentStep(0)
  }, [resetForm])

  // ═══════════════════════════════════════════════════════════════════════════
  // Render: Wizard
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <WizardLayout
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      canProceed={canProceed}
      isSubmitting={isSubmitting}
      storageKey={WIZARD_DRAFT_KEY}
      formData={wizardFormData}
      onRestoreDraft={handleRestoreDraft}
      onComplete={handleSubmit}
      onStartOver={resetForm}
    >
      {currentStep === 0 && (
        <ClientDetailsStep
          formData={{
            clientName, clientEmail, propertyAddress, proposalType,
            priceGuideMin, priceGuideMax,
            hasHeroImage: !!(heroImage || heroImageUrl || selectedAutoImageUrl),
          }}
          onChange={handleFieldChange}
          recentProposals={recentProposals}
          editingId={editingProposalId}
          onLoadProposal={(p) => handleEdit(p.id)}
          onDeleteProposal={handleDeleteProposal}
          onDuplicateProposal={(p) => handleDuplicate(p.id)}
        />
      )}

      {currentStep === 1 && proposalType === 'rental' && (
        <PropertyRentalStep
          formData={{
            askingRent,
            leaseType,
            availableDate,
            managementFee,
            lettingFee,
            heroImage,
            heroImageUrl,
            propertyAddress,
          }}
          autoImages={autoImageUrls}
          onChange={handleFieldChange}
        />
      )}

      {currentStep === 1 && proposalType !== 'rental' && (
        <PropertySaleStep
          formData={{
            methodOfSale,
            priceGuideMin,
            priceGuideMax,
            heroImage,
            heroImageUrl,
            commission,
            showPriceRange,
            showCommission,
            propertyAddress,
            dualCampaign,
            devMethodOfSale,
            devPriceGuideMin,
            devPriceGuideMax,
            devShowPriceRange,
          }}
          autoImages={autoImageUrls}
          onChange={handleFieldChange}
        />
      )}

      {currentStep === 2 && (
        <MarketingStep
          marketingCosts={marketingCosts}
          onChange={setMarketingCosts}
          propertyAddress={propertyAddress}
          priceGuideMin={priceGuideMin}
          priceGuideMax={priceGuideMax}
          dualCampaign={dualCampaign && proposalType !== 'rental'}
          devMarketingCosts={devMarketingCosts}
          onChangeDev={setDevMarketingCosts}
        />
      )}

      {currentStep === 3 && (
        <SoldPropertiesStep
          propertyAddress={propertyAddress}
          soldComparables={soldComparables}
          onChangeSold={setSoldComparables}
          onConfirmAddress={handleConfirmAddress}
          proposalType={proposalType}
          priceGuideMin={priceGuideMin}
          priceGuideMax={priceGuideMax}
          askingRent={askingRent}
        />
      )}

      {currentStep === 4 && (
        <ForSalePropertiesStep
          propertyAddress={propertyAddress}
          confirmedAddress={confirmedAddress}
          subjectLat={subjectLat}
          subjectLng={subjectLng}
          onMarketListings={onMarketListings}
          onChangeOnMarket={setOnMarketListings}
          proposalType={proposalType}
        />
      )}

      {currentStep === 5 && (
        <ReviewGenerateStep
          formData={{
            clientName,
            clientEmail,
            propertyAddress,
            methodOfSale,
            priceGuideMin,
            priceGuideMax,
            heroImage,
            heroImageUrl,
            commission,
          }}
          marketingCosts={marketingCosts}
          soldComparables={soldComparables}
          onMarketListings={onMarketListings}
          autoImages={autoImageUrls}
          editingId={editingProposalId}
          onSubmit={handleSubmit}
          onGoToStep={setCurrentStep}
          isSubmitting={isSubmitting}
          result={result?.success ? { id: result.id!, url: result.url! } : null}
          error={result && !result.success ? result.error || 'An error occurred' : null}
          onNewProposal={handleNewProposal}
        />
      )}
    </WizardLayout>
  )
}

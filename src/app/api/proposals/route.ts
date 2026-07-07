import { NextRequest, NextResponse } from 'next/server'
import { createProposal, parseCSV, parseExcel } from '@/lib/spreadsheet-parser'
import { saveProposal, getProposal, getAgencyConfig, listProposals, deleteProposal, setProposalOwner, getProposalOwner } from '@/lib/proposal-generator'
import { lookupComparables, lookupOnMarket } from '@/lib/comparables-lookup'
import { getCurrentUser } from '@/lib/current-user'
import { getEffectiveConfig } from '@/lib/user-profile'
import { PROPERTY_TYPES, type PropertyType } from '@/types/proposal'

interface WizardMarketingItem {
  id?: string; category: string; description: string; cost: number; included: boolean
}

// Build the weekly advertising schedule from raw wizard marketing items.
// The residential campaign keeps the original behaviour (weekly open-home rows);
// the development campaign omits them — open homes are residential-specific.
function buildAdvertisingSchedule(items: WizardMarketingItem[], opts: { includeOpenHomes: boolean }) {
  const prepItems = items.filter(i => i.category)
  // Campaign prep (week 0) gets all one-off items, weeks 1-4 get ongoing items
  const campaignPrep = prepItems.filter(i => !['Open Homes', 'Internet Listings'].some(k => i.category.toLowerCase().includes(k.toLowerCase())))
  const ongoingItems = prepItems.filter(i => ['Open Homes', 'Internet Listings'].some(k => i.category.toLowerCase().includes(k.toLowerCase())))

  return [
    {
      week: 0,
      activities: campaignPrep.map(i => ({
        category: i.category,
        description: i.description,
        ...(i.included ? { included: true } : { cost: i.cost }),
      })),
    },
    ...([1, 2, 3, 4].map(w => ({
      week: w,
      activities: [
        ...ongoingItems.map(i => ({
          category: i.category,
          description: w === 1 ? i.description : `Continued ${i.category.toLowerCase()}`,
          included: true as const,
        })),
        ...(opts.includeOpenHomes
          ? [{ category: 'Open Home', description: w === 1 ? 'First open home inspection' : 'Open home inspection', included: true as const }]
          : []),
      ],
    }))),
  ]
}

// Derive display/email channel rows from raw wizard items — the wizard path
// never populates marketingPlan, so the dev email table needs this.
function itemsToMarketingPlan(items: WizardMarketingItem[]) {
  return items.map(i => ({
    channel: i.category,
    description: i.description,
    cost: i.included ? 'Included' : `$${(i.cost || 0).toLocaleString()}`,
  }))
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const editProposalId = formData.get('editProposalId') as string | null
    const clientName = formData.get('clientName') as string
    const clientEmail = formData.get('clientEmail') as string
    const propertyAddress = formData.get('propertyAddress') as string
    const heroImage = formData.get('heroImage') as string | null
    const autoHeroImage = formData.get('autoHeroImage') as string | null
    const commissionRate = formData.get('commissionRate') as string | null
    const methodOfSale = formData.get('methodOfSale') as string | null
    const priceGuideMin = formData.get('priceGuideMin') as string | null
    const priceGuideMax = formData.get('priceGuideMax') as string | null
    const marketingCostsJson = formData.get('marketingCosts') as string | null
    const marketingTotalStr = formData.get('marketingTotal') as string | null
    const showPriceRange = formData.get('showPriceRange') as string | null
    const showCommission = formData.get('showCommission') as string | null
    const hiddenSectionsJson = formData.get('hiddenSections') as string | null
    const selectedCompsJson = formData.get('selectedComps') as string | null
    const selectedOnMarketJson = formData.get('selectedOnMarket') as string | null
    const comparablesHandled = formData.get('comparablesHandled') as string | null
    const proposalType = (formData.get('proposalType') as string | null) || 'sale'
    const template = (formData.get('template') as string | null) === 'simple' ? 'simple' : 'full'
    const propertyTypeRaw = formData.get('propertyType') as string | null
    const propertyType = PROPERTY_TYPES.includes(propertyTypeRaw as PropertyType)
      ? (propertyTypeRaw as PropertyType)
      : 'house'
    const askingRentStr = formData.get('askingRent') as string | null
    const leaseType = formData.get('leaseType') as string | null
    const availableDate = formData.get('availableDate') as string | null
    const managementFeeStr = formData.get('managementFee') as string | null
    const lettingFee = formData.get('lettingFee') as string | null
    const dualCampaign = formData.get('dualCampaign') as string | null
    const devMethodOfSale = formData.get('devMethodOfSale') as string | null
    const devPriceGuideMinStr = formData.get('devPriceGuideMin') as string | null
    const devPriceGuideMaxStr = formData.get('devPriceGuideMax') as string | null
    const devShowPriceRange = formData.get('devShowPriceRange') as string | null
    const devMarketingCostsJson = formData.get('devMarketingCosts') as string | null
    const devMarketingTotalStr = formData.get('devMarketingTotal') as string | null
    const file = formData.get('file') as File | null

    // Collect auto-fetched property gallery images
    const propertyImages: string[] = []
    for (const [key, value] of formData.entries()) {
      if (key === 'propertyImages[]' && typeof value === 'string' && value) {
        propertyImages.push(value)
      }
    }

    if (!clientName || !clientEmail || !propertyAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: clientName, clientEmail, propertyAddress' },
        { status: 400 }
      )
    }

    let spreadsheetRows: any[] = []
    const hasFile = file && file.name && file.size > 0

    if (hasFile) {
      const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'File too large. Maximum size is 10MB.' },
          { status: 400 }
        )
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const fileExtension = file.name.split('.').pop()?.toLowerCase()

      if (fileExtension === 'csv') {
        const text = buffer.toString('utf-8')
        spreadsheetRows = parseCSV(text)
      } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
        spreadsheetRows = parseExcel(buffer)
      } else {
        return NextResponse.json(
          { error: 'Unsupported file format. Please use CSV or Excel files.' },
          { status: 400 }
        )
      }
    }

    // Build with the logged-in agent's effective config (their overrides over
    // shared agency identity), falling back to the bare agency config if somehow
    // unauthenticated. The route is auth-protected by middleware.
    const currentUser = await getCurrentUser()
    const agencyConfig = currentUser
      ? await getEffectiveConfig(currentUser.email)
      : await getAgencyConfig()

    const parsedRate = commissionRate ? parseFloat(commissionRate) : NaN
    const rate = Number.isFinite(parsedRate) && parsedRate >= 0 && parsedRate <= 100
      ? parsedRate
      : agencyConfig.defaultCommissionRate

    // Use pre-selected comparables from setup page, or auto-lookup
    let onMarketListings
    let selectedComps: any[] = []
    let selectedOnMarket: any[] = []

    try {
      if (selectedCompsJson) selectedComps = JSON.parse(selectedCompsJson)
      if (selectedOnMarketJson) selectedOnMarket = JSON.parse(selectedOnMarketJson)
    } catch {}

    console.log(`[proposals] selectedCompsJson length: ${selectedCompsJson?.length ?? 'null'}, parsed: ${selectedComps.length}`)
    console.log(`[proposals] selectedOnMarketJson length: ${selectedOnMarketJson?.length ?? 'null'}, parsed: ${selectedOnMarket.length}`)

    if (selectedComps.length > 0) {
      // User picked comparables from the search
      spreadsheetRows = selectedComps
      console.log(`[proposals] Using ${selectedComps.length} pre-selected comparable sales`)
    }
    if (selectedOnMarket.length > 0) {
      onMarketListings = selectedOnMarket
      console.log(`[proposals] Using ${selectedOnMarket.length} pre-selected on-market listings`)
    }

    // Auto-lookup if nothing was pre-selected, no file uploaded, AND comparables weren't explicitly handled
    // When comparablesHandled is true, the user went through the wizard comparables step — respect their selection (even if empty)
    if (spreadsheetRows.length === 0 && selectedComps.length === 0 && !comparablesHandled) {
      try {
        console.log('[proposals] Looking up comparables for:', propertyAddress)
        const [comparables, onMarket] = await Promise.all([
          lookupComparables(propertyAddress),
          lookupOnMarket(propertyAddress),
        ])
        if (comparables.length > 0) {
          spreadsheetRows = comparables
          console.log(`[proposals] Found ${comparables.length} comparable sales`)
        }
        if (onMarket.length > 0 && !onMarketListings) {
          onMarketListings = onMarket
          console.log(`[proposals] Found ${onMarket.length} on-market listings`)
        }
      } catch (err) {
        console.error('[proposals] Comparables lookup failed:', err)
      }
    }

    // Use manual hero image, or auto-fetched, or undefined
    const finalHeroImage = heroImage || autoHeroImage || undefined

    const proposal = createProposal({
      clientName,
      clientEmail,
      propertyAddress,
      heroImage: finalHeroImage,
      propertyImages: propertyImages.length > 0 ? propertyImages : undefined,
      spreadsheetRows,
      fees: {
        commissionRate: rate,
        inclusions: (agencyConfig as any).defaultInclusions,
      },
      agency: agencyConfig,
    })

    // Client-facing template choice
    proposal.template = template

    // Subject property type — sale proposals only (rental keeps the default; stray values not persisted)
    if (proposalType !== 'rental') {
      proposal.propertyType = propertyType
    }

    // Rental fields
    proposal.proposalType = proposalType as 'sale' | 'rental'
    if (proposalType === 'rental') {
      if (askingRentStr) proposal.askingRent = parseInt(askingRentStr)
      if (leaseType) proposal.leaseType = leaseType
      if (availableDate) proposal.availableDate = availableDate
      if (managementFeeStr) proposal.managementFee = parseFloat(managementFeeStr)
      if (lettingFee) proposal.lettingFee = lettingFee
      // Override sale process with rental-specific process steps
      proposal.saleProcess = [
        { step: 1, title: 'Property Appraisal', description: 'A thorough market analysis and rental appraisal to determine the optimal weekly rent, benchmarked against comparable rentals in your area.' },
        { step: 2, title: 'Property Preparation', description: 'Professional photography and a comprehensive listing across realestate.com.au, Domain, and all major rental platforms to maximise exposure.' },
        { step: 3, title: 'Tenant Marketing', description: 'Targeted advertising campaign to attract quality, long-term tenants. We conduct open homes, private inspections, and respond promptly to all enquiries.' },
        { step: 4, title: 'Application Review', description: 'Thorough vetting of all tenant applications — including identity checks, employment and income verification, rental history, and national tenancy database checks.' },
        { step: 5, title: 'Lease & Bond', description: 'Comprehensive entry condition report with photos, bond lodgement with the RTBA, lease execution, and keys handover. Everything documented from day one.' },
        { step: 6, title: 'Ongoing Management', description: 'Regular routine inspections, maintenance coordination with trusted tradespeople, rent collection and disbursements, and full VCAT representation if required.' },
      ]
    }

    // Add method of sale and price guide
    if (methodOfSale) {
      proposal.methodOfSale = methodOfSale
    }

    // Override sale process with auction-specific steps
    if (methodOfSale?.toLowerCase() === 'auction') {
      proposal.saleProcess = [
        {
          step: 1,
          title: 'Auction Strategy Meeting',
          description: 'We meet to discuss your auction strategy, reserve price, and 4-week campaign plan. Together we align on expectations and set a clear path to auction day.',
          duration: '1–2 hours',
          imageUrl: '/images/stocksy/consultation.jpg',
        },
        {
          step: 2,
          title: 'Property Preparation',
          description: 'Professional photography, floor plans, and all marketing materials are produced and signed off before the campaign goes live.',
          duration: '5–7 days',
          imageUrl: '/images/stocksy/marketing-prep.jpg',
        },
        {
          step: 3,
          title: 'Campaign Launch',
          description: 'Your property goes live with a Premiere listing across realestate.com.au, Domain, and all major platforms. Maximum exposure from day one.',
          duration: 'Week 1',
          imageUrl: '/images/stocksy/launch.jpg',
        },
        {
          step: 4,
          title: 'Open Homes & Buyer Management',
          description: 'Weekly open homes throughout the campaign. We identify and qualify serious buyers, gather market feedback, and build competitive tension heading into auction day.',
          duration: 'Weeks 1–3',
          imageUrl: '/images/stocksy/viewings.jpg',
        },
        {
          step: 5,
          title: 'Auction Day',
          description: 'Competitive bidding in a transparent, public forum. Buyers compete openly — the highest bid above reserve secures the property and contracts are exchanged on the day.',
          duration: 'Week 4',
          imageUrl: '/images/stocksy/completion.jpg',
        },
        {
          step: 6,
          title: 'Post-Auction & Settlement',
          description: 'If sold under the hammer, contracts are exchanged immediately. If passed in, we negotiate directly with the highest bidder. We manage the full process through to settlement.',
          duration: '30–60 days',
          imageUrl: '/images/stocksy/valuation.jpg',
        },
      ]
    }
    const minPrice = priceGuideMin ? parseInt(priceGuideMin) : NaN
    const maxPrice = priceGuideMax ? parseInt(priceGuideMax) : NaN
    if (Number.isFinite(minPrice) && Number.isFinite(maxPrice) && minPrice > 0 && maxPrice > 0) {
      proposal.priceGuide = { min: minPrice, max: maxPrice }
    }

    // Show/hide toggles (default true for backwards compat)
    proposal.showPriceRange = showPriceRange !== '0'
    proposal.showCommission = showCommission !== '0'

    // Sidebar page toggles — sections excluded from the client proposal
    if (hiddenSectionsJson) {
      try {
        const parsed = JSON.parse(hiddenSectionsJson)
        if (Array.isArray(parsed)) proposal.hiddenSections = parsed.filter((s) => typeof s === 'string')
      } catch {
        // ignore malformed input — defaults to showing all sections
      }
    }

    // Add on-market listings
    if (onMarketListings && onMarketListings.length > 0) {
      proposal.onMarketListings = onMarketListings
    }

    // Add custom marketing costs as advertising schedule
    if (marketingCostsJson) {
      try {
        const items = JSON.parse(marketingCostsJson) as WizardMarketingItem[]
        if (items.length > 0) {
          // Persist the raw items verbatim so the single-page marketing plan
          // can be regenerated exactly (not just reconstructed from the schedule).
          proposal.marketingCosts = items
          proposal.advertisingSchedule = buildAdvertisingSchedule(items, { includeOpenHomes: true })
          proposal.totalAdvertisingCost = marketingTotalStr ? parseFloat(marketingTotalStr) : undefined
        }
      } catch {
        // Invalid JSON, ignore — defaults will be used
      }
    }

    // Dual target campaign (development site) — only when the toggle is on;
    // stray dev fields from stale drafts are ignored otherwise
    if (dualCampaign === '1' && proposalType !== 'rental') {
      proposal.dualCampaign = true
      proposal.devMethodOfSale = devMethodOfSale || undefined
      const devMin = devPriceGuideMinStr ? parseInt(devPriceGuideMinStr) : NaN
      const devMax = devPriceGuideMaxStr ? parseInt(devPriceGuideMaxStr) : NaN
      if (Number.isFinite(devMin) && Number.isFinite(devMax) && devMin > 0 && devMax > 0) {
        proposal.devPriceGuide = { min: devMin, max: devMax }
      }
      proposal.devShowPriceRange = devShowPriceRange !== '0'
      if (devMarketingCostsJson) {
        try {
          const devItems = JSON.parse(devMarketingCostsJson) as WizardMarketingItem[]
          if (devItems.length > 0) {
            proposal.devMarketingCosts = devItems
            proposal.devMarketingPlan = itemsToMarketingPlan(devItems)
            proposal.devAdvertisingSchedule = buildAdvertisingSchedule(devItems, { includeOpenHomes: false })
            proposal.devTotalAdvertisingCost = devMarketingTotalStr ? parseFloat(devMarketingTotalStr) : undefined
          }
        } catch {
          // Invalid JSON, ignore — wizard validation guards this in practice
        }
      }
    }

    // If editing, update the existing proposal instead of creating new
    if (editProposalId) {
      const existing = await getProposal(editProposalId)
      if (existing) {
        proposal.id = editProposalId
        proposal.status = existing.status
        proposal.proposalDate = existing.proposalDate
        proposal.sentAt = existing.sentAt
        proposal.viewedAt = existing.viewedAt
        proposal.approvedAt = existing.approvedAt
      }
    }

    await saveProposal(proposal)

    // Stamp ownership on creation only — never reassign an existing proposal on edit.
    if (!editProposalId && currentUser) {
      setProposalOwner(proposal.id, currentUser.email)
    }

    return NextResponse.json({
      success: true,
      proposal: {
        id: proposal.id,
        url: `/proposal/${proposal.id}`,
      },
    })
  } catch (error) {
    console.error('Error creating proposal:', error)
    return NextResponse.json(
      { error: 'Failed to create proposal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const user = await getCurrentUser()

    if (id) {
      const { getProposal, getActivities } = await import('@/lib/proposal-generator')
      const proposal = await getProposal(id)

      if (!proposal) {
        return NextResponse.json(
          { error: 'Proposal not found' },
          { status: 404 }
        )
      }

      // Non-principals may only open their own proposals. NULL-owner (pre-rollout)
      // proposals belong to the principal. Respond 404 (not 403) to avoid leaking
      // existence of another agent's proposal.
      if (user && !user.isPrincipal) {
        const owner = getProposalOwner(id)
        if ((owner ?? '').toLowerCase() !== user.email) {
          return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
        }
      }

      const includeActivities = searchParams.get('activities') === 'true'
      if (includeActivities) {
        const activities = getActivities(id)
        return NextResponse.json({ ...proposal, activities })
      }

      return NextResponse.json(proposal)
    }

    // List proposals scoped to the acting user: principal sees all, others see own.
    const proposals = await listProposals(
      user && !user.isPrincipal ? { ownerEmail: user.email } : undefined
    )
    return NextResponse.json({ proposals })
  } catch (error) {
    console.error('Error fetching proposal:', error)
    return NextResponse.json(
      { error: 'Failed to fetch proposal' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Proposal ID required' },
        { status: 400 }
      )
    }

    const deleted = await deleteProposal(id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting proposal:', error)
    return NextResponse.json(
      { error: 'Failed to delete proposal' },
      { status: 500 }
    )
  }
}

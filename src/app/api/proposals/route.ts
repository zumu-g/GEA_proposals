import { NextRequest, NextResponse } from 'next/server'
import { createProposal, parseCSV, parseExcel } from '@/lib/spreadsheet-parser'
import { saveProposal, getProposal, getAgencyConfig, listProposals, deleteProposal } from '@/lib/proposal-generator'
import { lookupComparables, lookupOnMarket } from '@/lib/comparables-lookup'

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
    const selectedCompsJson = formData.get('selectedComps') as string | null
    const selectedOnMarketJson = formData.get('selectedOnMarket') as string | null
    const comparablesHandled = formData.get('comparablesHandled') as string | null
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

    const agencyConfig = await getAgencyConfig()

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

    // Add method of sale and price guide
    if (methodOfSale) {
      proposal.methodOfSale = methodOfSale
    }
    const minPrice = priceGuideMin ? parseInt(priceGuideMin) : NaN
    const maxPrice = priceGuideMax ? parseInt(priceGuideMax) : NaN
    if (Number.isFinite(minPrice) && Number.isFinite(maxPrice) && minPrice > 0 && maxPrice > 0) {
      proposal.priceGuide = { min: minPrice, max: maxPrice }
    }

    // Add on-market listings
    if (onMarketListings && onMarketListings.length > 0) {
      proposal.onMarketListings = onMarketListings
    }

    // Add custom marketing costs as advertising schedule
    if (marketingCostsJson) {
      try {
        const items = JSON.parse(marketingCostsJson) as Array<{
          category: string; description: string; cost: number; included: boolean
        }>
        if (items.length > 0) {
          const prepItems = items.filter(i => i.category)
          // Campaign prep (week 0) gets all one-off items, weeks 1-4 get ongoing items
          const campaignPrep = prepItems.filter(i => !['Open Homes', 'Internet Listings'].some(k => i.category.toLowerCase().includes(k.toLowerCase())))
          const ongoingItems = prepItems.filter(i => ['Open Homes', 'Internet Listings'].some(k => i.category.toLowerCase().includes(k.toLowerCase())))

          const schedule = [
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
                ...(w === 1 ? [] : []),
                ...ongoingItems.map(i => ({
                  category: i.category,
                  description: w === 1 ? i.description : `Continued ${i.category.toLowerCase()}`,
                  included: true as const,
                })),
                { category: 'Open Home', description: w === 1 ? 'First open home inspection' : 'Open home inspection', included: true as const },
              ],
            }))),
          ]
          proposal.advertisingSchedule = schedule
          proposal.totalAdvertisingCost = marketingTotalStr ? parseFloat(marketingTotalStr) : undefined
        }
      } catch {
        // Invalid JSON, ignore — defaults will be used
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

    if (id) {
      const { getProposal, getActivities } = await import('@/lib/proposal-generator')
      const proposal = await getProposal(id)

      if (!proposal) {
        return NextResponse.json(
          { error: 'Proposal not found' },
          { status: 404 }
        )
      }

      const includeActivities = searchParams.get('activities') === 'true'
      if (includeActivities) {
        const activities = getActivities(id)
        return NextResponse.json({ ...proposal, activities })
      }

      return NextResponse.json(proposal)
    }

    // List all proposals
    const proposals = await listProposals()
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

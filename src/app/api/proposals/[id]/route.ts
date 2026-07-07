import { NextRequest, NextResponse } from 'next/server'
import { getProposal, updateProposal, deleteProposal, logActivity, DEFAULT_DATABASE_INFO } from '@/lib/proposal-generator'
import { PROPERTY_TYPES, type PropertyType } from '@/types/proposal'
import { PROPERTY_TYPE_CONTENT, getPropertyTypeContent, resolveSaleProcess } from '@/lib/property-type-content'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const proposal = await getProposal(id)

    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(proposal)
  } catch (error) {
    console.error('Error fetching proposal:', error)
    return NextResponse.json(
      { error: 'Failed to fetch proposal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    const existing = await getProposal(id)
    if (!existing) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      )
    }

    // Build the partial update from allowed editable fields
    const updates: Record<string, unknown> = {}

    if (body.clientName !== undefined) updates.clientName = body.clientName
    if (body.clientEmail !== undefined) updates.clientEmail = body.clientEmail
    if (body.propertyAddress !== undefined) updates.propertyAddress = body.propertyAddress
    if (body.methodOfSale !== undefined) updates.methodOfSale = body.methodOfSale

    // Subject property type (whitelisted values only; invalid values ignored;
    // rental proposals never carry a type — mirrors the POST guard)
    if (
      body.propertyType !== undefined &&
      PROPERTY_TYPES.includes(body.propertyType) &&
      existing.proposalType !== 'rental'
    ) {
      const newType = body.propertyType as PropertyType
      updates.propertyType = newType
      // Keep the proposal internally consistent on a type change: regenerate the
      // persisted sale-process steps, and swap the databaseInfo default only when
      // the stored text IS a type default (agent-authored copy is never touched)
      if (newType !== (existing.propertyType || 'house')) {
        const method = body.methodOfSale !== undefined ? body.methodOfSale : existing.methodOfSale
        updates.saleProcess = resolveSaleProcess(newType, method)
        const typeDefaults = [
          DEFAULT_DATABASE_INFO,
          ...Object.values(PROPERTY_TYPE_CONTENT).map(c => c.copy.databaseInfo).filter(Boolean),
        ]
        if (!existing.databaseInfo || typeDefaults.includes(existing.databaseInfo)) {
          updates.databaseInfo =
            getPropertyTypeContent(newType).copy.databaseInfo || DEFAULT_DATABASE_INFO
        }
      }
    }

    // Price guide
    if (body.priceGuide !== undefined) {
      if (body.priceGuide === null) {
        updates.priceGuide = undefined
      } else {
        const min = parseInt(body.priceGuide.min)
        const max = parseInt(body.priceGuide.max)
        if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max > 0) {
          updates.priceGuide = { min, max }
        }
      }
    }

    // Commission rate (nested in fees)
    if (body.commissionRate !== undefined) {
      const rate = parseFloat(body.commissionRate)
      if (Number.isFinite(rate) && rate >= 0 && rate <= 100) {
        updates.fees = {
          ...(existing.fees || {}),
          commissionRate: rate,
        }
      }
    }

    // Marketing budget
    if (body.marketingBudget !== undefined) {
      updates.totalAdvertisingCost = body.marketingBudget === null
        ? undefined
        : parseFloat(body.marketingBudget) || undefined
    }

    // Agent comments / notes
    if (body.agentNotes !== undefined) {
      updates.marketingApproach = body.agentNotes || undefined
    }

    // Comparable sales (recentSales)
    if (body.recentSales !== undefined) {
      updates.recentSales = body.recentSales
    }

    // On-market listings
    if (body.onMarketListings !== undefined) {
      updates.onMarketListings = body.onMarketListings
    }

    // Advertising schedule
    if (body.advertisingSchedule !== undefined) {
      updates.advertisingSchedule = body.advertisingSchedule
    }

    // Status update
    if (body.status !== undefined) {
      const validStatuses = ['draft', 'sent', 'viewed', 'approved', 'rejected']
      if (validStatuses.includes(body.status)) {
        updates.status = body.status
        // Set timestamps for status transitions
        if (body.status === 'sent' && !existing.sentAt) {
          updates.sentAt = new Date().toISOString()
        }
        if (body.status === 'viewed' && !existing.viewedAt) {
          updates.viewedAt = new Date().toISOString()
        }
        if (body.status === 'approved' && !existing.approvedAt) {
          updates.approvedAt = new Date().toISOString()
        }
      }
    }

    const updated = await updateProposal(id, updates)

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update proposal' },
        { status: 500 }
      )
    }

    // Log the edit activity
    logActivity(id, 'edited', 'Proposal edited from admin UI')

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating proposal:', error)
    return NextResponse.json(
      { error: 'Failed to update proposal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const existing = await getProposal(id)
    if (!existing) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      )
    }

    const deleted = await deleteProposal(id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete proposal' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Proposal deleted' })
  } catch (error) {
    console.error('Error deleting proposal:', error)
    return NextResponse.json(
      { error: 'Failed to delete proposal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

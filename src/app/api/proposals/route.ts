import { NextRequest, NextResponse } from 'next/server'
import { createProposal, parseCSV, parseExcel } from '@/lib/spreadsheet-parser'
import { saveProposal, getAgencyConfig, listProposals, deleteProposal } from '@/lib/proposal-generator'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const clientName = formData.get('clientName') as string
    const clientEmail = formData.get('clientEmail') as string
    const propertyAddress = formData.get('propertyAddress') as string
    const heroImage = formData.get('heroImage') as string | null
    const commissionRate = formData.get('commissionRate') as string | null
    const file = formData.get('file') as File | null

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

    const proposal = createProposal({
      clientName,
      clientEmail,
      propertyAddress,
      heroImage: heroImage || undefined,
      spreadsheetRows,
      fees: {
        commissionRate: rate,
        inclusions: agencyConfig.defaultInclusions,
      },
      agency: {
        name: agencyConfig.name,
        logo: agencyConfig.logo,
        primaryColor: agencyConfig.primaryColor,
        accentColor: agencyConfig.accentColor,
        defaultCommissionRate: agencyConfig.defaultCommissionRate,
        contactEmail: agencyConfig.contactEmail,
        contactPhone: agencyConfig.contactPhone,
        address: agencyConfig.address,
        website: agencyConfig.website,
      },
    })

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

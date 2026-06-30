import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/current-user'
import { listCampaigns, saveCampaign, deleteCampaign } from '@/lib/saved-campaigns'

export const runtime = 'nodejs'

// GET /api/campaigns — the caller's saved campaigns (principal sees all)
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const campaigns = listCampaigns(user.email, { all: user.isPrincipal })
  return NextResponse.json({ campaigns })
}

// POST /api/campaigns — save a campaign { name, items }
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { name?: string; items?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const name = (body.name || '').toString().trim()
  if (!name) return NextResponse.json({ error: 'Campaign name required' }, { status: 400 })
  const items = Array.isArray(body.items) ? (body.items as any[]) : []

  const campaign = saveCampaign(user.email, name, items)
  return NextResponse.json({ campaign })
}

// DELETE /api/campaigns?id=123 — delete one the caller owns
export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = Number(request.nextUrl.searchParams.get('id'))
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'Valid campaign id required' }, { status: 400 })
  }
  const removed = deleteCampaign(user.email, id, { all: user.isPrincipal })
  if (!removed) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}

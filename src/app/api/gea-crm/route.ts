import { NextRequest, NextResponse } from 'next/server'
import { searchProperty } from '@/lib/gea-crm'

export const runtime = 'nodejs'

// GET /api/gea-crm?address=<full address>
// Browser-safe proxy to the GEA_CRM property search — keeps the bearer token
// server-side. Always 200 with the CRM result shape; a CRM-side failure comes
// back as { found:false, ..., error } so the client degrades to everypropertyAI.
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address') || ''
  if (!address.trim()) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 })
  }
  const result = await searchProperty(address)
  return NextResponse.json(result)
}

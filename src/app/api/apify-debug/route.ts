import { NextResponse } from 'next/server'

// Temporary debug endpoint — returns raw Apify response for one suburb
// so we can identify the correct image and price field names.
// DELETE after diagnosis.

export async function GET() {
  const APIFY_TOKEN = process.env.APIFY_API_TOKEN
  if (!APIFY_TOKEN) return NextResponse.json({ error: 'No APIFY_API_TOKEN' }, { status: 500 })

  const url = 'https://www.realestate.com.au/buy/in-berwick,+vic+3806/list-1'
  const res = await fetch(
    `https://api.apify.com/v2/acts/azzouzana~real-estate-au-scraper-pro/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startUrl: url, maxItems: 3 }),
      signal: AbortSignal.timeout(120000),
    }
  )

  const data = await res.json()
  // Return first item with all keys visible
  const first = Array.isArray(data) ? data[0] : data
  return NextResponse.json({ keys: first ? Object.keys(first) : [], first, total: Array.isArray(data) ? data.length : 0 })
}

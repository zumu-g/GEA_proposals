import { upsertLeasedProperties, upsertForRentProperties } from './property-cache'
import { NEIGHBORING_SUBURBS } from './comparables-lookup'
import type { ScrapedSale } from './firecrawl-scraper'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN
const ACTOR_ID = 'azzouzana~real-estate-au-scraper-pro'
const APIFY_BASE = 'https://api.apify.com/v2'

const SUBURB_POSTCODES: Record<string, string> = {
  berwick: '3806', 'narre warren': '3805', 'narre warren north': '3804',
  'narre warren south': '3805', pakenham: '3810', officer: '3809',
  beaconsfield: '3807', 'beaconsfield upper': '3808', cranbourne: '3977',
  'cranbourne east': '3977', 'cranbourne west': '3977', 'cranbourne north': '3977',
  'cranbourne south': '3977', clyde: '3978', 'clyde north': '3978',
  'hampton park': '3976', hallam: '3803', 'endeavour hills': '3802',
  lynbrook: '3975', lyndhurst: '3975', dandenong: '3175',
  'dandenong south': '3175', 'noble park': '3174', 'noble park north': '3174',
  keysborough: '3173', doveton: '3177', 'nar nar goon': '3812',
  cardinia: '3978', 'pakenham upper': '3810',
}

export function isApifyRentalAvailable(): boolean {
  return !!APIFY_TOKEN
}

async function scrapeSuburbLeasedViaApify(suburb: string, postcode: string): Promise<ScrapedSale[]> {
  if (!APIFY_TOKEN) return []

  const slug = suburb.replace(/\s+/g, '-')
  const url = `https://www.realestate.com.au/leased/in-${slug},+vic+${postcode}/list-1`

  try {
    const res = await fetch(
      `${APIFY_BASE}/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startUrl: url, maxItems: 30 }),
        signal: AbortSignal.timeout(120000),
      }
    )

    const data = await res.json()
    if (!Array.isArray(data)) return []

    return data.map((item: any) => {
      const priceStr = String(item.price || '')
      const firstNum = priceStr.match(/\$?([\d,]+)/)
      const price = firstNum ? parseInt(firstNum[1].replace(/,/g, '')) || 0 : 0
      const priceDisplay = priceStr || undefined

      const imageUrl = (Array.isArray(item.images) && item.images[0])
        || item.mainImage || item.imageUrl || item.headerImage || undefined

      const lat = item.latitude ?? item.lat ?? undefined
      const lng = item.longitude ?? item.lng ?? undefined

      const streetAddr = item.address || item.fullAddress || item.streetAddress || ''
      const fullAddress = streetAddr && item.suburb
        ? `${streetAddr}, ${item.suburb} VIC ${postcode}`
        : streetAddr || `${item.suburb || suburb} VIC ${postcode}`

      return {
        address: fullAddress,
        suburb,
        state: 'vic',
        postcode,
        price,
        priceDisplay,
        bedrooms: item.bedrooms || item.beds || 0,
        bathrooms: item.bathrooms || item.baths || 0,
        carSpaces: item.carSpaces || item.cars || item.parking || 0,
        propertyType: item.propertyType || item.type || 'House',
        soldDate: '',
        url: item.url || item.link || '',
        imageUrl,
        lat,
        lng,
        source: 'realestate.com.au' as const,
      }
    })
  } catch (err) {
    console.error(`[rental-scraper] Apify leased error for ${suburb}:`, err instanceof Error ? err.message : err)
    return []
  }
}

async function scrapeSuburbForRentViaApify(suburb: string, postcode: string): Promise<ScrapedSale[]> {
  if (!APIFY_TOKEN) return []

  const slug = suburb.replace(/\s+/g, '-')
  const url = `https://www.realestate.com.au/rent/in-${slug},+vic+${postcode}/list-1`

  try {
    const res = await fetch(
      `${APIFY_BASE}/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startUrl: url, maxItems: 30 }),
        signal: AbortSignal.timeout(120000),
      }
    )

    const data = await res.json()
    if (!Array.isArray(data)) return []

    return data.map((item: any) => {
      const priceStr = String(item.price || '')
      const firstNum = priceStr.match(/\$?([\d,]+)/)
      const price = firstNum ? parseInt(firstNum[1].replace(/,/g, '')) || 0 : 0
      const priceDisplay = priceStr || undefined

      const imageUrl = (Array.isArray(item.images) && item.images[0])
        || item.mainImage || item.imageUrl || item.headerImage || undefined

      const lat = item.latitude ?? item.lat ?? undefined
      const lng = item.longitude ?? item.lng ?? undefined

      const streetAddr = item.address || item.fullAddress || item.streetAddress || ''
      const fullAddress = streetAddr && item.suburb
        ? `${streetAddr}, ${item.suburb} VIC ${postcode}`
        : streetAddr || `${item.suburb || suburb} VIC ${postcode}`

      return {
        address: fullAddress,
        suburb,
        state: 'vic',
        postcode,
        price,
        priceDisplay,
        bedrooms: item.bedrooms || item.beds || 0,
        bathrooms: item.bathrooms || item.baths || 0,
        carSpaces: item.carSpaces || item.cars || item.parking || 0,
        propertyType: item.propertyType || item.type || 'House',
        soldDate: '',
        url: item.url || item.link || '',
        imageUrl,
        lat,
        lng,
        source: 'realestate.com.au' as const,
      }
    })
  } catch (err) {
    console.error(`[rental-scraper] Apify for-rent error for ${suburb}:`, err instanceof Error ? err.message : err)
    return []
  }
}

export async function runDailyLeasedScrape(): Promise<{
  totalScraped: number
  stored: number
  suburbs: string[]
  errors: number
}> {
  if (!APIFY_TOKEN) {
    console.log('[rental-scraper] APIFY_API_TOKEN not set — skipping leased scrape')
    return { totalScraped: 0, stored: 0, suburbs: [], errors: 0 }
  }

  const allSuburbs = new Set<string>()
  for (const [suburb, neighbors] of Object.entries(NEIGHBORING_SUBURBS)) {
    const pc = SUBURB_POSTCODES[suburb]
    if (pc) allSuburbs.add(suburb)
    for (const n of neighbors) {
      if (SUBURB_POSTCODES[n]) allSuburbs.add(n)
    }
  }

  const suburbList = Array.from(allSuburbs).sort()
  const BATCH_SIZE = 6

  const now = new Date()
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  const batchIndex = dayOfYear % Math.ceil(suburbList.length / BATCH_SIZE)
  const start = batchIndex * BATCH_SIZE
  const todaysBatch = suburbList.slice(start, start + BATCH_SIZE)

  console.log(
    `[rental-scraper] Leased — Day ${dayOfYear}, batch ${batchIndex + 1}: ` +
    `scraping ${todaysBatch.length} suburbs — ${todaysBatch.join(', ')}`
  )

  let totalScraped = 0
  let totalStored = 0
  let errors = 0

  for (let i = 0; i < todaysBatch.length; i++) {
    const suburb = todaysBatch[i]
    const postcode = SUBURB_POSTCODES[suburb]
    if (!postcode) continue

    try {
      const listings = await scrapeSuburbLeasedViaApify(suburb, postcode)
      totalScraped += listings.length

      if (listings.length > 0) {
        const stored = upsertLeasedProperties(listings)
        totalStored += stored
        console.log(`[rental-scraper] leased ${suburb}: ${listings.length} listings, ${stored} stored`)
      } else {
        console.log(`[rental-scraper] leased ${suburb}: 0 listings`)
      }
    } catch (err) {
      console.error(`[rental-scraper] Leased error for ${suburb}:`, err instanceof Error ? err.message : err)
      errors++
    }

    if (i < todaysBatch.length - 1) {
      await new Promise(r => setTimeout(r, 5000))
    }
  }

  console.log(
    `[rental-scraper] Leased complete — ${totalScraped} scraped, ${totalStored} stored ` +
    `across ${todaysBatch.length} suburbs, ${errors} errors`
  )

  return { totalScraped, stored: totalStored, suburbs: todaysBatch, errors }
}

export async function runDailyForRentScrape(): Promise<{
  totalScraped: number
  stored: number
  suburbs: string[]
  errors: number
}> {
  if (!APIFY_TOKEN) {
    console.log('[rental-scraper] APIFY_API_TOKEN not set — skipping for-rent scrape')
    return { totalScraped: 0, stored: 0, suburbs: [], errors: 0 }
  }

  const allSuburbs = new Set<string>()
  for (const [suburb, neighbors] of Object.entries(NEIGHBORING_SUBURBS)) {
    const pc = SUBURB_POSTCODES[suburb]
    if (pc) allSuburbs.add(suburb)
    for (const n of neighbors) {
      if (SUBURB_POSTCODES[n]) allSuburbs.add(n)
    }
  }

  const suburbList = Array.from(allSuburbs).sort()
  const BATCH_SIZE = 6

  const now = new Date()
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  const batchIndex = dayOfYear % Math.ceil(suburbList.length / BATCH_SIZE)
  const start = batchIndex * BATCH_SIZE
  const todaysBatch = suburbList.slice(start, start + BATCH_SIZE)

  console.log(
    `[rental-scraper] For-rent — Day ${dayOfYear}, batch ${batchIndex + 1}: ` +
    `scraping ${todaysBatch.length} suburbs — ${todaysBatch.join(', ')}`
  )

  let totalScraped = 0
  let totalStored = 0
  let errors = 0

  for (let i = 0; i < todaysBatch.length; i++) {
    const suburb = todaysBatch[i]
    const postcode = SUBURB_POSTCODES[suburb]
    if (!postcode) continue

    try {
      const listings = await scrapeSuburbForRentViaApify(suburb, postcode)
      totalScraped += listings.length

      if (listings.length > 0) {
        const stored = upsertForRentProperties(listings)
        totalStored += stored
        console.log(`[rental-scraper] for-rent ${suburb}: ${listings.length} listings, ${stored} stored`)
      } else {
        console.log(`[rental-scraper] for-rent ${suburb}: 0 listings`)
      }
    } catch (err) {
      console.error(`[rental-scraper] For-rent error for ${suburb}:`, err instanceof Error ? err.message : err)
      errors++
    }

    if (i < todaysBatch.length - 1) {
      await new Promise(r => setTimeout(r, 5000))
    }
  }

  console.log(
    `[rental-scraper] For-rent complete — ${totalScraped} scraped, ${totalStored} stored ` +
    `across ${todaysBatch.length} suburbs, ${errors} errors`
  )

  return { totalScraped, stored: totalStored, suburbs: todaysBatch, errors }
}

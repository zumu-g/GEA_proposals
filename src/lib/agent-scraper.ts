/**
 * Agent Website Scraper
 *
 * Scrapes sold listings from local Casey/Cardinia real estate agent profiles
 * on realestate.com.au. Uses Firecrawl to bypass bot protection.
 *
 * Deduplicates against existing sold_properties table by address + sold_date.
 * Runs daily via cron to capture new sales from competing agents.
 */

import { isFirecrawlAvailable, scrapeSoldListings } from './firecrawl-scraper'
import { upsertSoldProperties, getSoldPropertyCount } from './property-cache'
import { geocodeAddress } from './geocoding'
import type { ScrapedSale } from './firecrawl-scraper'

// ─── Local Casey/Cardinia Agent Registry ─────────────────────────────────────
// Each agent has a name and their primary suburbs to scrape sold listings for.
// We scrape REA suburb sold pages filtered by the suburbs these agents operate in,
// which captures all agent sales in those areas (not just one agency).

export interface LocalAgent {
  name: string
  suburbs: string[] // suburbs they primarily operate in
}

export const LOCAL_AGENTS: LocalAgent[] = [
  // ── Major Franchise Networks ──
  {
    name: 'Ray White (Berwick, Officer, Pakenham, Cranbourne, Narre Warren)',
    suburbs: ['berwick', 'officer', 'pakenham', 'cranbourne', 'narre warren'],
  },
  {
    name: 'Barry Plant (Berwick, Narre Warren, Cranbourne)',
    suburbs: ['berwick', 'narre warren', 'cranbourne', 'clyde north'],
  },
  {
    name: 'OBrien Real Estate (Berwick, Narre Warren, Cranbourne, Pakenham)',
    suburbs: ['berwick', 'narre warren', 'cranbourne', 'pakenham'],
  },
  {
    name: 'Harcourts (Berwick, Pakenham, Cranbourne)',
    suburbs: ['berwick', 'pakenham', 'cranbourne', 'narre warren'],
  },
  {
    name: 'First National Neilson Partners (Narre Warren, Pakenham, Officer)',
    suburbs: ['narre warren', 'pakenham', 'officer'],
  },
  {
    name: 'Fletchers (Cranbourne, Narre Warren)',
    suburbs: ['cranbourne', 'narre warren', 'cranbourne north'],
  },
  {
    name: 'LJ Hooker (Pakenham, Cranbourne, Hampton Park)',
    suburbs: ['pakenham', 'cranbourne', 'hampton park'],
  },

  // ── Local Independents ──
  {
    name: 'YPA Estate Agents (Cranbourne)',
    suburbs: ['cranbourne', 'hampton park', 'clyde'],
  },
  {
    name: 'Area Specialist Casey',
    suburbs: ['narre warren', 'berwick', 'cranbourne'],
  },
  {
    name: 'Stockdale & Leggo (Cranbourne, Narre Warren)',
    suburbs: ['cranbourne', 'narre warren', 'hallam'],
  },
  {
    name: 'KR Peters (Officer)',
    suburbs: ['officer', 'pakenham', 'clyde north'],
  },
  {
    name: 'Century 21 (Narre Warren)',
    suburbs: ['narre warren', 'dandenong', 'hallam'],
  },
  {
    name: 'Uphill Real Estate (Officer, Pakenham)',
    suburbs: ['officer', 'pakenham', 'beaconsfield'],
  },
  {
    name: 'Pioneer Real Estate (Hampton Park)',
    suburbs: ['hampton park', 'narre warren south', 'lynbrook', 'hallam'],
  },
  {
    name: 'Keen Real Estate (Beaconsfield)',
    suburbs: ['beaconsfield', 'berwick', 'officer'],
  },
]

// Deduplicated list of all suburbs covered by local agents
export function getAllAgentSuburbs(): string[] {
  const suburbs = new Set<string>()
  for (const agent of LOCAL_AGENTS) {
    for (const suburb of agent.suburbs) {
      suburbs.add(suburb.toLowerCase())
    }
  }
  return Array.from(suburbs).sort()
}

// ─── Suburb postcode lookup ──────────────────────────────────────────────────
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

// ─── Main scrape function ────────────────────────────────────────────────────

/**
 * Scrape sold listings for all agent suburbs, deduplicate against existing DB,
 * geocode new properties, and store them.
 *
 * Returns summary stats.
 */
export async function runAgentScrape(): Promise<{
  totalScraped: number
  newStored: number
  duplicatesSkipped: number
  suburbs: number
  errors: number
}> {
  if (!isFirecrawlAvailable()) {
    console.log('[agent-scraper] FIRECRAWL_API_KEY not set — skipping')
    return { totalScraped: 0, newStored: 0, duplicatesSkipped: 0, suburbs: 0, errors: 0 }
  }

  const suburbs = getAllAgentSuburbs()
  console.log(`[agent-scraper] Starting agent suburb scrape — ${suburbs.length} suburbs`)

  let totalScraped = 0
  let totalNewStored = 0
  let totalDuplicates = 0
  let totalErrors = 0

  for (let i = 0; i < suburbs.length; i++) {
    const suburb = suburbs[i]
    const postcode = SUBURB_POSTCODES[suburb]

    if (!postcode) {
      console.log(`[agent-scraper] No postcode for ${suburb}, skipping`)
      continue
    }

    try {
      const beforeCount = getSoldPropertyCount(suburb)

      // Scrape 3 pages of sold listings (most recent ~75 sales)
      const results = await scrapeSoldListings(suburb, 'vic', postcode, 3)

      if (results.length === 0) {
        console.log(`[agent-scraper] ${suburb}: no results`)
        continue
      }

      totalScraped += results.length

      // Geocode new properties without coords (max 10 per suburb to stay fast)
      const toGeocode = results.filter(r => !r.lat || !r.lng).slice(0, 10)
      for (const result of toGeocode) {
        try {
          const coords = await geocodeAddress(result.address)
          if (coords) {
            result.lat = coords.lat
            result.lng = coords.lng
          }
        } catch {
          // Skip failed geocoding
        }
      }

      // Upsert — deduplicates via UNIQUE(address, sold_date) constraint
      const stored = upsertSoldProperties(results)
      const afterCount = getSoldPropertyCount(suburb)
      const newCount = afterCount - beforeCount

      totalNewStored += newCount
      totalDuplicates += results.length - newCount

      console.log(
        `[agent-scraper] ${suburb}: scraped=${results.length} new=${newCount} ` +
        `dupes=${results.length - newCount} total=${afterCount}`
      )
    } catch (err) {
      console.error(`[agent-scraper] Error scraping ${suburb}:`, err instanceof Error ? err.message : err)
      totalErrors++
    }

    // Rate limit: 5s between suburbs
    if (i < suburbs.length - 1) {
      await new Promise(r => setTimeout(r, 5000))
    }
  }

  console.log(
    `[agent-scraper] Complete — scraped=${totalScraped} new=${totalNewStored} ` +
    `dupes=${totalDuplicates} suburbs=${suburbs.length} errors=${totalErrors}`
  )

  return {
    totalScraped,
    newStored: totalNewStored,
    duplicatesSkipped: totalDuplicates,
    suburbs: suburbs.length,
    errors: totalErrors,
  }
}

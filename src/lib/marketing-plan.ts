// ─────────────────────────────────────────────────────────────────────────────
// Marketing plan — shared types & helpers
//
// The wizard collects marketing line items as `MarketingCostItem[]`
// (category / description / cost / included). This is the canonical shape used
// by the single-page marketing-plan PDF. We persist it verbatim on the proposal
// (`marketingCosts`); for legacy proposals saved before that column existed, we
// reconstruct the items from the proposal's `advertisingSchedule`.
// ─────────────────────────────────────────────────────────────────────────────

import type { AdvertisingWeek, MarketingCostItem } from '@/types/proposal'

export type { MarketingCostItem }

// ─────────────────────────────────────────────────────────────────────────────
// REA "premiere listing" (4-week) rate card — effective 1 July 2026.
// The premiere listing cost varies by the property's suburb; default to the
// Berwick rate when the suburb is unknown.
// ─────────────────────────────────────────────────────────────────────────────

/** Default REA premiere (4-week) rate (Berwick), used when suburb is unknown. */
export const REACOM_PREMIERE_DEFAULT = 3019

/** Suburb → REA premiere rate. Keys are lowercase suburb names. */
const REACOM_PREMIERE_RATES: Record<string, number> = {
  // $3019
  'berwick': 3019,
  'beaconsfield': 3019,
  'narre warren': 3019,
  'narre warren north': 3019,
  'narre warren south': 3019,
  'hallam': 3019,
  'cranbourne': 3019,
  'cranbourne north': 3019,
  // $2819
  'pakenham': 2819,
  'pakenham upper': 2819,
  'officer': 2819,
  // $1999
  'clyde': 1999,
  'clyde north': 1999,
  'cardinia': 1999,
  'officer south': 1999,
  // $1519
  'nyora': 1519,
  'tynong': 1519,
  'tynong north': 1519,
  'nar nar goon': 1519,
  'nar nar goon north': 1519,
  'maryknoll': 1519,
  'garfield': 1519,
  'koo wee rup': 1519,
  // $1439
  'drouin': 1439,
  'drouin south': 1439,
  'drouin east': 1439,
  'drouin west': 1439,
}

/** All distinct rate-card values (used to detect user-edited premiere costs). */
export const REACOM_PREMIERE_RATE_VALUES: number[] = Array.from(
  new Set([REACOM_PREMIERE_DEFAULT, ...Object.values(REACOM_PREMIERE_RATES)])
)

/**
 * Resolve the REA premiere (4-week) listing rate for a suburb or full address.
 * Returns REACOM_PREMIERE_DEFAULT when the suburb can't be matched.
 */
export function reacomPremiereForSuburb(suburbOrAddress: string | undefined): number {
  if (!suburbOrAddress) return REACOM_PREMIERE_DEFAULT
  const input = suburbOrAddress.toLowerCase().trim()

  // Exact match (input is just a suburb name).
  if (REACOM_PREMIERE_RATES[input] !== undefined) return REACOM_PREMIERE_RATES[input]

  // Fall back to substring match (handles full addresses) — longest suburb name
  // first so e.g. "narre warren south" wins over "narre warren".
  const names = Object.keys(REACOM_PREMIERE_RATES).sort((a, b) => b.length - a.length)
  for (const name of names) {
    if (input.includes(name)) return REACOM_PREMIERE_RATES[name]
  }

  return REACOM_PREMIERE_DEFAULT
}

/** Title-case a suburb name, e.g. "narre warren north" → "Narre Warren North". */
export function suburbLabelForPremiere(suburbOrAddress: string | undefined): string | null {
  if (!suburbOrAddress) return null
  const input = suburbOrAddress.toLowerCase().trim()
  let match: string | undefined
  if (REACOM_PREMIERE_RATES[input] !== undefined) {
    match = input
  } else {
    const names = Object.keys(REACOM_PREMIERE_RATES).sort((a, b) => b.length - a.length)
    match = names.find((name) => input.includes(name))
  }
  if (!match) return null
  return match.replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─────────────────────────────────────────────────────────────────────────────
// Marketing options catalog — effective 1 July 2026.
// Agents pick a category, then a specific option that fills description + cost.
// The Internet/Premiere category is resolved per property suburb at point of use
// (see `premiereCatalogOption`), so it is not a fixed entry here.
// ─────────────────────────────────────────────────────────────────────────────

export interface CatalogOption {
  /** Becomes the marketing item's description. */
  description: string
  cost: number
}

/** Fixed, suburb-independent catalog grouped by item category. */
export const MARKETING_CATALOG: Record<string, CatalogOption[]> = {
  Signboard: [
    { description: 'Central signboard — 3 x 7 (sale/lease)', cost: 60 },
    { description: 'Central signboard — 4 x 8 sale (Stuart Stock Board)', cost: 100 },
    { description: 'Central photo board — 4 x 8 (Auction, Stuart provides artwork)', cost: 380 },
  ],
  Auctioneer: [
    { description: 'Aleisha — professional auctioneer', cost: 700 },
  ],
  Photography: [
    { description: 'Complete Image — Standard Rental Shoot (10 images, web only)', cost: 150 },
    { description: 'Complete Image — Sales Day Shoot (10 images)', cost: 205 },
    { description: 'Complete Image — Sales Day Shoot (20 images)', cost: 255 },
    { description: 'Complete Image — Drone photos only with overlays (5–6 images)', cost: 390 },
    { description: 'Complete Image — Sales Day Shoot (20) & 2D floor plan & site plan', cost: 370 },
    { description: 'Complete Image — Sales Day Shoot (20) & 2D FP & SP & drone', cost: 550 },
    { description: 'Complete Image — Sales Twilight & 2D FP & SP', cost: 505 },
    { description: 'Complete Image — Sales Twilight & 2D FP & SP & drone', cost: 685 },
    { description: 'Complete Image — Floor Plan & Site Plan (2D)', cost: 130 },
    { description: 'Complete Image — Floor Plan redraw', cost: 77 },
  ],
}

/**
 * The premiere-listing catalog option for a given property suburb/address.
 * Priced from the suburb rate card so it always reflects the right suburb.
 */
export function premiereCatalogOption(suburbOrAddress: string | undefined): CatalogOption {
  const cost = reacomPremiereForSuburb(suburbOrAddress)
  const suburb = suburbLabelForPremiere(suburbOrAddress)
  return {
    description: `Premiere Listing — realestate.com.au (4 week premiere${suburb ? ` — ${suburb}` : ''})`,
    cost,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REA "Luxe" listing tier — FY27 rate card. Luxe is a lower-cost listing upgrade
// offered alongside Premiere, priced by the same suburb tiers. Mapped off the
// premiere rate so the two stay in lock-step:
//   Premiere $3019 → Luxe $2500 | $2819 → $2350 | $1999 → $1650
// Tiers not present on the FY27 card (premiere $1519 / $1439) have no Luxe price,
// so no Luxe option is offered for those suburbs rather than inventing one.
// ─────────────────────────────────────────────────────────────────────────────
const REACOM_LUXE_BY_PREMIERE: Record<number, number> = {
  3019: 2500,
  2819: 2350,
  1999: 1650,
}

/** Resolve the REA Luxe rate for a suburb/address, or null when the tier has no Luxe price. */
export function reacomLuxeForSuburb(suburbOrAddress: string | undefined): number | null {
  return REACOM_LUXE_BY_PREMIERE[reacomPremiereForSuburb(suburbOrAddress)] ?? null
}

/** The Luxe-listing catalog option for a suburb/address, or null if unavailable. */
export function luxeCatalogOption(suburbOrAddress: string | undefined): CatalogOption | null {
  const cost = reacomLuxeForSuburb(suburbOrAddress)
  if (cost == null) return null
  const suburb = suburbLabelForPremiere(suburbOrAddress)
  return {
    description: `Luxe Listing — realestate.com.au (4 week luxe${suburb ? ` — ${suburb}` : ''})`,
    cost,
  }
}

/** Categories that have catalog options (fixed catalog + premiere via Internet). */
export const CATALOG_CATEGORIES = Object.keys(MARKETING_CATALOG)

/** Sum of costs for items NOT marked as included (i.e. the vendor's spend). */
export function planTotal(items: MarketingCostItem[]): number {
  return items
    .filter((i) => !i.included)
    .reduce((sum, i) => sum + (Number(i.cost) || 0), 0)
}

/** Total value including "included at no cost" items (the full campaign value). */
export function planGrandTotal(items: MarketingCostItem[]): number {
  return items.reduce((sum, i) => sum + (Number(i.cost) || 0), 0)
}

/**
 * Document title for the marketing-plan page — drives the default "Save as PDF"
 * filename, e.g. "GEA Marketing plan - 34 Allunga Parade". Uses the street part
 * of the address (before the first comma) for a clean filename.
 */
export function marketingPlanTitle(address?: string): string {
  const street = (address || '').split(',')[0].trim()
  return street ? `GEA Marketing plan - ${street}` : 'GEA Marketing plan'
}

/** Format a number as AUD, no cents. */
export function formatAUD(n: number): string {
  return `$${Math.round(n || 0).toLocaleString('en-AU')}`
}

/**
 * Reconstruct marketing line items from a proposal's advertising schedule.
 * Used as a fallback for proposals saved before `marketingCosts` was persisted.
 * Week 0 holds the one-off campaign-prep items (with real cost/included);
 * ongoing items first appear in week 1 (marked included). We take week 0 as-is
 * plus the distinct non-"Open Home" week-1 items, deduped by category+description.
 */
export function itemsFromSchedule(schedule?: AdvertisingWeek[]): MarketingCostItem[] {
  if (!schedule || schedule.length === 0) return []
  const out: MarketingCostItem[] = []
  const seen = new Set<string>()

  const push = (category: string, description: string, cost: number, included: boolean) => {
    const key = `${category}|${description}`.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push({ category, description, cost, included })
  }

  for (const week of schedule) {
    if (week.week !== 0 && week.week !== 1) continue
    for (const a of week.activities || []) {
      // Skip the synthetic open-home rows and "continued ..." duplicates.
      if (/open home/i.test(a.category) || /^continued /i.test(a.description)) continue
      push(a.category, a.description, Number(a.cost) || 0, a.included === true)
    }
  }
  return out
}

/**
 * Resolve the marketing items for a proposal: prefer the persisted raw items,
 * else reconstruct from the advertising schedule.
 */
export function resolvePlanItems(
  marketingCosts: MarketingCostItem[] | undefined,
  schedule?: AdvertisingWeek[]
): MarketingCostItem[] {
  if (marketingCosts && marketingCosts.length > 0) return marketingCosts
  return itemsFromSchedule(schedule)
}

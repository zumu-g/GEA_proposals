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
// REA "premiere listing" (4-week) rate card — effective 1 July 2025.
// The premiere listing cost varies by the property's suburb; default to the
// Berwick rate when the suburb is unknown.
// ─────────────────────────────────────────────────────────────────────────────

/** Default REA premiere (4-week) rate (Berwick), used when suburb is unknown. */
export const REACOM_PREMIERE_DEFAULT = 2760

/** Suburb → REA premiere rate. Keys are lowercase suburb names. */
const REACOM_PREMIERE_RATES: Record<string, number> = {
  // $2760
  'berwick': 2760,
  'beaconsfield': 2760,
  'narre warren': 2760,
  'narre warren north': 2760,
  'narre warren south': 2760,
  'hallam': 2760,
  'cranbourne': 2760,
  'cranbourne north': 2760,
  // $2540
  'pakenham': 2540,
  'pakenham upper': 2540,
  'officer': 2540,
  // $1580
  'clyde': 1580,
  'clyde north': 1580,
  'cardinia': 1580,
  // $1380
  'nyora': 1380,
  'tynong': 1380,
  'tynong north': 1380,
  'nar nar goon': 1380,
  'nar nar goon north': 1380,
  'maryknoll': 1380,
  'garfield': 1380,
  'koo wee rup': 1380,
  // $1310
  'drouin': 1310,
  'drouin south': 1310,
  'drouin east': 1310,
  'drouin west': 1310,
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

// ─────────────────────────────────────────────────────────────────────────────
// Backfill real per-property coordinates for sold comparables.
//
// Many sold_properties rows are stored at the suburb centroid (the scrapers only
// keep coords the source API provides). This geocodes each row's actual street
// address (rate-limited, cached) and writes the real lat/lng back, so distance
// from the subject property is accurate. Rows are marked `geocoded_at` so they
// are not re-processed.
// ─────────────────────────────────────────────────────────────────────────────

import { geocodeAddress } from './geocoding'
import {
  getSoldRowsNeedingGeocode,
  countSoldNeedingGeocode,
  updateSoldCoords,
  markSoldGeocoded,
  getLeasedRowsNeedingGeocode,
  countLeasedNeedingGeocode,
  updateLeasedCoords,
  markLeasedGeocoded,
} from './property-cache'

export async function backfillSoldCoords(
  suburbs: string[],
  limit: number,
  primarySuburb?: string
): Promise<{ updated: number; attempted: number; remaining: number }> {
  const rows = getSoldRowsNeedingGeocode(suburbs, limit, primarySuburb)
  let updated = 0

  for (const row of rows) {
    try {
      const coords = await geocodeAddress(row.address) // 1 req/s, cached
      if (coords) {
        updateSoldCoords(row.id, coords.lat, coords.lng)
        updated++
      } else {
        markSoldGeocoded(row.id) // un-geocodable — don't retry forever
      }
    } catch {
      markSoldGeocoded(row.id)
    }
  }

  return { updated, attempted: rows.length, remaining: countSoldNeedingGeocode(suburbs) }
}

// Leased comps from Apify usually arrive with coordinates, but older/sparser
// rows can be missing them — which makes distance filtering impossible. This
// geocodes each row's real street address and writes lat/lng back, mirroring
// the sold backfill above.
export async function backfillLeasedCoords(
  suburbs: string[],
  limit: number,
  primarySuburb?: string
): Promise<{ updated: number; attempted: number; remaining: number }> {
  const rows = getLeasedRowsNeedingGeocode(suburbs, limit, primarySuburb)
  let updated = 0

  for (const row of rows) {
    try {
      const coords = await geocodeAddress(row.address) // 1 req/s, cached
      if (coords) {
        updateLeasedCoords(row.id, coords.lat, coords.lng)
        updated++
      } else {
        markLeasedGeocoded(row.id) // un-geocodable — don't retry forever
      }
    } catch {
      markLeasedGeocoded(row.id)
    }
  }

  return { updated, attempted: rows.length, remaining: countLeasedNeedingGeocode(suburbs) }
}

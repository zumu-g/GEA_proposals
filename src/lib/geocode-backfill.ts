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

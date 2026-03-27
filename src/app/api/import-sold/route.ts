import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

/**
 * POST /api/import-sold
 * Bulk import sold properties from JSON array.
 * Used to seed the Railway database from local data.
 */
export async function POST(request: NextRequest) {
  try {
    const properties = await request.json()

    if (!Array.isArray(properties) || properties.length === 0) {
      return NextResponse.json({ error: 'Expected a JSON array of properties' }, { status: 400 })
    }

    const db = getDb()
    const insert = db.prepare(`
      INSERT OR IGNORE INTO sold_properties
        (address, suburb, state, postcode, price, bedrooms, bathrooms, car_spaces,
         property_type, sold_date, url, image_url, lat, lng, land_size, source, scraped_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'import', datetime('now'))
    `)

    const insertMany = db.transaction((rows: any[]) => {
      let count = 0
      for (const r of rows) {
        const result = insert.run(
          r.address || '',
          r.suburb || '',
          r.state || 'vic',
          r.postcode || '',
          r.price || 0,
          r.bedrooms || 0,
          r.bathrooms || 0,
          r.car_spaces || 0,
          r.property_type || 'House',
          r.sold_date || '',
          r.url || '',
          r.image_url || '',
          r.lat || null,
          r.lng || null,
          r.land_size || null,
        )
        if (result.changes > 0) count++
      }
      return count
    })

    const stored = insertMany(properties)

    // Get total count
    const total = db.prepare('SELECT COUNT(*) as count FROM sold_properties').get() as { count: number }

    return NextResponse.json({
      imported: stored,
      duplicatesSkipped: properties.length - stored,
      total: total.count,
    })
  } catch (err) {
    console.error('[import-sold] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Import failed' },
      { status: 500 },
    )
  }
}

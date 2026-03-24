import { NextResponse } from 'next/server'

// ─── Cache imports (created by other agent — fallback gracefully if missing) ──
let cacheAvailable = false
let getCachedSuburbs: (() => any[]) | null = null
let getCacheMetadata: ((suburb: string) => any) | null = null
let isCacheFresh: ((suburb: string, listingType: string, maxAgeHours?: number) => boolean) | null = null
let refreshSoldCache: ((suburb: string) => Promise<{ count: number; source: string }>) | null = null
let refreshOnMarketCache: ((suburb: string) => Promise<{ count: number; source: string }>) | null = null
let refreshSuburbCache: ((suburb: string) => Promise<{ sold: any; onMarket: any; source: string }>) | null = null

try {
  const propertyCache = require('@/lib/property-cache')
  const cacheRefresh = require('@/lib/cache-refresh')
  getCachedSuburbs = propertyCache.getCachedSuburbs
  getCacheMetadata = propertyCache.getCacheMetadata
  isCacheFresh = propertyCache.isCacheFresh
  refreshSoldCache = cacheRefresh.refreshSoldCache
  refreshOnMarketCache = cacheRefresh.refreshOnMarketCache
  refreshSuburbCache = cacheRefresh.refreshSuburbCache
  cacheAvailable = true
} catch {
  console.log('[api/cache] Cache modules not available')
}

// ─── GET /api/cache ───────────────────────────────────────────────────────────
// Returns cache status for all suburbs, or a single suburb if ?suburb= is provided
export async function GET(request: Request) {
  if (!cacheAvailable || !getCachedSuburbs || !getCacheMetadata || !isCacheFresh) {
    return NextResponse.json(
      { error: 'Cache modules not available', available: false },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(request.url)
  const suburb = searchParams.get('suburb')

  try {
    if (suburb) {
      // Single suburb status
      const suburbLower = suburb.toLowerCase()
      const meta = getCacheMetadata(suburbLower)

      const soldFresh = isCacheFresh(suburbLower, 'sold', 168) // 7 days
      const onMarketFresh = isCacheFresh(suburbLower, 'on_market', 24) // 24 hours

      return NextResponse.json({
        suburb: suburbLower,
        sold: {
          ...(meta?.sold || {}),
          fresh: soldFresh,
          maxAgeHours: 168,
        },
        on_market: {
          ...(meta?.on_market || {}),
          fresh: onMarketFresh,
          maxAgeHours: 24,
        },
      })
    }

    // All suburbs
    const suburbs = getCachedSuburbs()
    const statuses = suburbs.map((s: any) => {
      const suburbName = typeof s === 'string' ? s : s.suburb
      const meta = getCacheMetadata(suburbName)
      return {
        suburb: suburbName,
        sold: {
          ...(meta?.sold || {}),
          fresh: isCacheFresh(suburbName, 'sold', 168),
        },
        on_market: {
          ...(meta?.on_market || {}),
          fresh: isCacheFresh(suburbName, 'on_market', 24),
        },
      }
    })

    return NextResponse.json({
      available: true,
      count: statuses.length,
      suburbs: statuses,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read cache status' },
      { status: 500 }
    )
  }
}

// ─── POST /api/cache ──────────────────────────────────────────────────────────
// Actions:
//   { action: 'refresh', suburb: 'officer' } — refresh one suburb (sold + on-market)
//   { action: 'refresh-sold', suburb: 'officer' } — refresh sold only
//   { action: 'refresh-on-market', suburb: 'officer' } — refresh on-market only
//   { action: 'refresh-all' } — refresh all active suburbs
export async function POST(request: Request) {
  if (!cacheAvailable) {
    return NextResponse.json(
      { error: 'Cache modules not available', available: false },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const { action, suburb } = body

    if (!action) {
      return NextResponse.json({ error: 'action required' }, { status: 400 })
    }

    switch (action) {
      case 'refresh': {
        if (!suburb) {
          return NextResponse.json({ error: 'suburb required for refresh' }, { status: 400 })
        }
        const suburbLower = suburb.toLowerCase()

        if (refreshSuburbCache) {
          const result = await refreshSuburbCache(suburbLower)
          return NextResponse.json({
            success: true,
            action: 'refresh',
            suburb: suburbLower,
            ...result,
          })
        }

        // Fallback: refresh individually
        if (!refreshSoldCache || !refreshOnMarketCache) {
          return NextResponse.json({ error: 'Refresh functions not available' }, { status: 503 })
        }

        const [soldResult, onMarketResult] = await Promise.all([
          refreshSoldCache(suburbLower),
          refreshOnMarketCache(suburbLower),
        ])

        return NextResponse.json({
          success: true,
          action: 'refresh',
          suburb: suburbLower,
          sold: soldResult,
          onMarket: onMarketResult,
        })
      }

      case 'refresh-sold': {
        if (!suburb || !refreshSoldCache) {
          return NextResponse.json({ error: 'suburb required and refresh function must be available' }, { status: 400 })
        }
        const result = await refreshSoldCache(suburb.toLowerCase())
        return NextResponse.json({
          success: true,
          action: 'refresh-sold',
          suburb: suburb.toLowerCase(),
          ...result,
        })
      }

      case 'refresh-on-market': {
        if (!suburb || !refreshOnMarketCache) {
          return NextResponse.json({ error: 'suburb required and refresh function must be available' }, { status: 400 })
        }
        const result = await refreshOnMarketCache(suburb.toLowerCase())
        return NextResponse.json({
          success: true,
          action: 'refresh-on-market',
          suburb: suburb.toLowerCase(),
          ...result,
        })
      }

      case 'refresh-all': {
        if (!getCachedSuburbs || !refreshSuburbCache) {
          return NextResponse.json({ error: 'Required functions not available' }, { status: 503 })
        }

        const suburbs = getCachedSuburbs()
        const results: any[] = []

        for (const s of suburbs) {
          const suburbName = typeof s === 'string' ? s : s.suburb
          try {
            const result = await refreshSuburbCache(suburbName)
            results.push({ suburb: suburbName, success: true, ...result })
          } catch (err) {
            results.push({
              suburb: suburbName,
              success: false,
              error: err instanceof Error ? err.message : 'Failed',
            })
          }
        }

        return NextResponse.json({
          success: true,
          action: 'refresh-all',
          count: results.length,
          results,
        })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cache operation failed' },
      { status: 500 }
    )
  }
}

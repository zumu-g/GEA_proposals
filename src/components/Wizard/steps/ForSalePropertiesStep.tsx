'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ComparableRow } from './SoldPropertiesStep'

// ─── Props ───────────────────────────────────────────────────────────────────

interface ForSalePropertiesStepProps {
  propertyAddress: string
  confirmedAddress: string
  subjectLat: number | null
  subjectLng: number | null
  onMarketListings: ComparableRow[]
  onChangeOnMarket: (rows: ComparableRow[]) => void
}

// ─── Internal row type ───────────────────────────────────────────────────────

interface InternalOnMarketRow {
  address: string
  askingPrice: string
  bedrooms: string
  bathrooms: string
  cars: string
  propertyType: string
  url: string
  imageUrl: string
  included: boolean
  distance?: number
  lat?: number
  lng?: number
}

// ─── Validation ──────────────────────────────────────────────────────────────

export function validateForSaleProperties(onMarket: ComparableRow[]): string | null {
  // Warning only, not blocking — always returns null
  return null
}

export function getForSaleWarning(onMarket: ComparableRow[]): string | null {
  const includedOnMarket = onMarket.filter(r => r.included && r.address.trim())
  if (includedOnMarket.length === 0) {
    return 'No on-market listings selected. Consider adding some for a stronger proposal.'
  }
  return null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtPrice(val: string): string {
  if (!val) return ''
  // If it already looks formatted (contains $ and commas), return as-is
  if (val.includes('$') && val.includes(',')) return val
  // Handle price ranges like "649000 - 699000" or "649000-699000"
  const rangeMatch = val.match(/(\d+)\s*[-–]\s*(\d+)/)
  if (rangeMatch) {
    const low = parseInt(rangeMatch[1])
    const high = parseInt(rangeMatch[2])
    if (low && high) return `$${low.toLocaleString()} - $${high.toLocaleString()}`
  }
  // Single number
  const num = parseInt(val.replace(/[^0-9]/g, ''))
  return num ? `$${num.toLocaleString()}` : val
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`
  return `${km.toFixed(1)}km`
}

function extractSuburb(address: string): string {
  const commaMatch = address.match(/,\s*([A-Za-z\s]+?)(?:\s+[A-Z]{2,3}\s+\d{4})\s*$/)
  if (commaMatch) return commaMatch[1].trim()
  const parts = address.split(',')
  if (parts.length >= 2) {
    const after = parts[1].trim().replace(/\s+[A-Z]{2,3}\s+\d{4}$/, '').trim()
    if (after) return after
  }
  return address
}

// ─── Conversion helpers ─────────────────────────────────────────────────────

function onMarketToExternal(row: InternalOnMarketRow): ComparableRow {
  return {
    address: row.address,
    price: row.askingPrice,
    beds: row.bedrooms,
    baths: row.bathrooms,
    cars: row.cars,
    url: row.url,
    imageUrl: row.imageUrl || undefined,
    propertyType: row.propertyType,
    included: row.included,
  }
}

function externalToOnMarket(row: ComparableRow): InternalOnMarketRow {
  return {
    address: row.address,
    askingPrice: row.price,
    bedrooms: row.beds,
    bathrooms: row.baths,
    cars: row.cars || '0',
    propertyType: row.propertyType || 'House',
    url: row.url || '',
    imageUrl: row.imageUrl || '',
    included: row.included ?? true,
  }
}

// ─── Distance filter options ─────────────────────────────────────────────────

const DISTANCE_OPTIONS = [
  { label: '500m', value: 0.5 },
  { label: '1km', value: 1 },
  { label: '2km', value: 2 },
  { label: '5km', value: 5 },
  { label: '10km', value: 10 },
  { label: 'Any', value: Infinity },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function ForSalePropertiesStep({
  propertyAddress,
  confirmedAddress,
  subjectLat,
  subjectLng,
  onMarketListings,
  onChangeOnMarket,
}: ForSalePropertiesStepProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    setPrefersReducedMotion(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }, [])

  // ─── Internal state ────────────────────────────────────────────────────
  const [onMarketRows, setOnMarketRows] = useState<InternalOnMarketRow[]>(
    onMarketListings.map(externalToOnMarket)
  )

  // Raw unfiltered results
  const [rawOnMarket, setRawOnMarket] = useState<any[]>([])

  // Search state
  const [isSearching, setIsSearching] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [dataSource, setDataSource] = useState('')
  const [isCached, setIsCached] = useState(false)
  const [cacheAge, setCacheAge] = useState('')
  const hasSearchedRef = useRef(false)

  // ─── Distance filter (primary) ─────────────────────────────────────────
  const [distanceFilter, setDistanceFilter] = useState(2)

  // ─── Secondary filters ────────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false)
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [bedsMin, setBedsMin] = useState('')
  const [bathsMin, setBathsMin] = useState('')
  const [propType, setPropType] = useState('')
  const [sortBy, setSortBy] = useState('distance-asc')

  // Image error tracking
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Exclusion tracking
  const excludedOnMarketRef = useRef<Set<string>>(new Set())
  const removedOnMarketRef = useRef<Set<string>>(new Set())

  // Manual add
  const [showManualOnMarket, setShowManualOnMarket] = useState(false)
  const [manualAddress, setManualAddress] = useState('')
  const [manualPrice, setManualPrice] = useState('')
  const [manualBeds, setManualBeds] = useState('')
  const [manualBaths, setManualBaths] = useState('')
  const [manualCars, setManualCars] = useState('')
  const [manualType, setManualType] = useState('House')

  // ─── Sync internal state to parent ────────────────────────────────────
  const syncOnMarketRef = useRef(onChangeOnMarket)
  syncOnMarketRef.current = onChangeOnMarket

  useEffect(() => {
    syncOnMarketRef.current(onMarketRows.map(onMarketToExternal))
  }, [onMarketRows])

  // ─── Apply filters + sorting (client-side) ────────────────────────────
  const applyFilters = useCallback(
    (onMarket: any[]) => {
      const sLat = subjectLat
      const sLng = subjectLng

      let filteredBuy = onMarket.filter((s: any) => {
        if (removedOnMarketRef.current.has(s.address || '')) return false
        if (distanceFilter !== Infinity && sLat && sLng && s.lat && s.lng) {
          const dist = haversineKm(sLat, sLng, s.lat, s.lng)
          if (dist > distanceFilter) return false
        }
        if (bedsMin && Number(s.bedrooms) < Number(bedsMin)) return false
        if (bathsMin && Number(s.bathrooms) < Number(bathsMin)) return false
        if (priceMin || priceMax) {
          const numPrice = parseInt((s.askingPrice || '').replace(/[^0-9]/g, ''))
          if (!numPrice) return true
          if (priceMin && numPrice < Number(priceMin)) return false
          if (priceMax && numPrice > Number(priceMax)) return false
        }
        if (
          propType &&
          s.propertyType &&
          !s.propertyType.toLowerCase().includes(propType.toLowerCase())
        )
          return false
        return true
      })

      filteredBuy.sort((a: any, b: any) => {
        const priceA = parseInt((a.askingPrice || '').replace(/[^0-9]/g, '')) || 0
        const priceB = parseInt((b.askingPrice || '').replace(/[^0-9]/g, '')) || 0
        switch (sortBy) {
          case 'distance-asc':
            if (sLat && sLng) {
              const distA = a.lat && a.lng ? haversineKm(sLat, sLng, a.lat, a.lng) : 999
              const distB = b.lat && b.lng ? haversineKm(sLat, sLng, b.lat, b.lng) : 999
              return distA - distB
            }
            return 0
          case 'price-asc':
            return priceA - priceB
          case 'price-desc':
            return priceB - priceA
          case 'beds-desc':
            return (Number(b.bedrooms) || 0) - (Number(a.bedrooms) || 0)
          default:
            return 0
        }
      })

      setOnMarketRows(
        filteredBuy.map((s: any) => {
          const dist =
            sLat && sLng && s.lat && s.lng
              ? haversineKm(sLat, sLng, s.lat, s.lng)
              : undefined
          const addr = s.address || ''
          return {
            address: addr,
            askingPrice: s.askingPrice || (s.price ? String(s.price) : ''),
            bedrooms: s.bedrooms ? String(s.bedrooms) : '',
            bathrooms: s.bathrooms ? String(s.bathrooms) : '',
            cars: s.cars ? String(s.cars) : '0',
            propertyType: s.propertyType || 'House',
            url: s.url || '',
            imageUrl: s.imageUrl || '',
            included: !excludedOnMarketRef.current.has(addr),
            distance: dist,
            lat: s.lat,
            lng: s.lng,
          }
        })
      )

      const buyCount = filteredBuy.length
      setStatusMessage(
        `Found ${buyCount} on-market listings${buyCount < onMarket.length ? ` (from ${onMarket.length})` : ''}`
      )
    },
    [distanceFilter, bedsMin, bathsMin, priceMin, priceMax, propType, sortBy, subjectLat, subjectLng]
  )

  // Re-apply filters when filter values change
  useEffect(() => {
    if (rawOnMarket.length > 0) {
      applyFilters(rawOnMarket)
    }
  }, [distanceFilter, bedsMin, bathsMin, priceMin, priceMax, propType, sortBy, subjectLat, subjectLng, rawOnMarket, applyFilters])

  // ─── Search function ──────────────────────────────────────────────────
  const searchListings = useCallback(
    async (searchAddress?: string) => {
      const addr = searchAddress || confirmedAddress
      if (!addr) return
      if (isSearching) return

      const suburb = extractSuburb(addr)
      setIsSearching(true)
      setStatusMessage('Searching...')
      excludedOnMarketRef.current.clear()
      removedOnMarketRef.current.clear()

      try {
        const buyRes = await fetch(`/api/comparables?address=${encodeURIComponent(suburb)}&type=buy`)
        const buyData = await buyRes.json()

        if (buyData.error) {
          setStatusMessage(`Search failed: ${buyData.error}`)
          setIsSearching(false)
          return
        }

        const onMarketResult = buyData.sales || []
        setRawOnMarket(onMarketResult)

        const src = buyData.source || ''
        setDataSource(src)
        setIsCached(!!buyData.cached)
        setCacheAge(buyData.cacheAge || '')

        if (onMarketResult.length === 0) {
          setStatusMessage(
            `No on-market listings found for "${suburb}". Try a different distance.`
          )
        } else {
          applyFilters(onMarketResult)
        }
      } catch (err) {
        setStatusMessage(
          `Search failed: ${err instanceof Error ? err.message : 'network error'}`
        )
      }
      setIsSearching(false)
      hasSearchedRef.current = true
    },
    [confirmedAddress, isSearching, applyFilters]
  )

  // ─── Refresh function ─────────────────────────────────────────────────
  const refreshListings = useCallback(async () => {
    const addr = confirmedAddress
    if (!addr || isRefreshing || isSearching) return

    const suburb = extractSuburb(addr)
    setIsRefreshing(true)
    setStatusMessage('Refreshing from homely...')
    excludedOnMarketRef.current.clear()
    removedOnMarketRef.current.clear()

    try {
      const buyRes = await fetch(`/api/comparables?address=${encodeURIComponent(suburb)}&type=buy&refresh=true`)
      const buyData = await buyRes.json()

      if (buyData.error) {
        setStatusMessage(`Refresh failed: ${buyData.error}`)
        setIsRefreshing(false)
        return
      }

      const onMarketResult = buyData.sales || []
      setRawOnMarket(onMarketResult)

      const src = buyData.source || ''
      setDataSource(src)
      setIsCached(false)
      setCacheAge('just now')

      if (onMarketResult.length === 0) {
        setStatusMessage(`No on-market listings found on refresh.`)
      } else {
        applyFilters(onMarketResult)
      }
    } catch (err) {
      setStatusMessage(
        `Refresh failed: ${err instanceof Error ? err.message : 'network error'}`
      )
    }
    setIsRefreshing(false)
  }, [confirmedAddress, isRefreshing, isSearching, applyFilters])

  // ─── Auto-search on mount using the confirmed address ─────────────────
  const hasAutoSearched = useRef(false)
  useEffect(() => {
    if (confirmedAddress && !hasAutoSearched.current && onMarketRows.length === 0) {
      hasAutoSearched.current = true
      searchListings(confirmedAddress)
    }
  }, [confirmedAddress]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Row manipulation ─────────────────────────────────────────────────
  const updateOnMarketRow = (index: number, field: keyof InternalOnMarketRow, value: string) => {
    setOnMarketRows(prev =>
      prev.map((r, i) => {
        if (i !== index) return r
        const updated = { ...r, [field]: field === 'included' ? !!value : value }
        if (field === 'included') {
          if (!value) {
            excludedOnMarketRef.current.add(r.address)
          } else {
            excludedOnMarketRef.current.delete(r.address)
          }
        }
        return updated
      })
    )
  }

  const removeOnMarketRow = (index: number) => {
    setOnMarketRows(prev => {
      const row = prev[index]
      if (row) removedOnMarketRef.current.add(row.address)
      return prev.filter((_, i) => i !== index)
    })
  }

  // ─── Manual add ───────────────────────────────────────────────────────
  const resetManualForm = () => {
    setManualAddress('')
    setManualPrice('')
    setManualBeds('')
    setManualBaths('')
    setManualCars('')
    setManualType('House')
  }

  const addManualOnMarket = () => {
    if (!manualAddress.trim()) return
    setOnMarketRows(prev => [
      ...prev,
      {
        address: manualAddress.trim(),
        askingPrice: manualPrice,
        bedrooms: manualBeds,
        bathrooms: manualBaths,
        cars: manualCars || '0',
        propertyType: manualType,
        url: '',
        imageUrl: '',
        included: true,
      },
    ])
    resetManualForm()
    setShowManualOnMarket(false)
  }

  // ─── Counts ───────────────────────────────────────────────────────────
  const selectedOnMarketCount = onMarketRows.filter(r => r.included && r.address.trim()).length

  const hasActiveFilters = !!(priceMin || priceMax || bedsMin || bathsMin || propType)

  // ─── Animation ────────────────────────────────────────────────────────
  const fadeUp = prefersReducedMotion
    ? {}
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }

  const inputClasses =
    'w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans text-sm placeholder-gray-400 focus:ring-2 focus:ring-[#C41E2A]/50 focus:border-[#C41E2A]/50 transition-all'
  const selectClasses =
    'w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans text-sm focus:ring-2 focus:ring-[#C41E2A]/50 focus:border-[#C41E2A]/50 transition-all'
  const labelClasses = 'text-gray-500 font-sans text-[10px] uppercase tracking-wider mb-1.5 block'

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <motion.div
      {...fadeUp}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h2 className="text-gray-900 font-display text-2xl font-light lowercase tracking-tight">
          for sale / on market
        </h2>
        <p className="text-gray-500 font-sans text-sm mt-1">
          current listings near the subject property — optional but strengthens the proposal
        </p>
      </div>

      {/* ═══════ CONFIRMED ADDRESS (read-only from previous step) ═══════ */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-visible">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            <p className="text-gray-500 font-sans text-xs uppercase tracking-wider">
              subject property
            </p>
            <span className="text-gray-300 font-sans text-[10px] ml-auto">from previous step</span>
          </div>

          {confirmedAddress ? (
            <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p className="text-gray-900 font-sans text-sm font-medium flex-1">
                {confirmedAddress}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <p className="text-amber-700 font-sans text-sm">
                Go back to the Sold Properties step to confirm an address first.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ SEARCH & FILTERS ═══════ */}
      {confirmedAddress && (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="space-y-4"
        >
          {/* ─── Distance Pills (Primary Filter) ─── */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-500 font-sans text-xs uppercase tracking-wider">
                  distance from subject
                </p>
                <div className="flex items-center gap-2">
                  {rawOnMarket.length > 0 && (
                    <button
                      type="button"
                      onClick={refreshListings}
                      disabled={isRefreshing || isSearching}
                      title="Re-fetch latest data"
                      className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded hover:bg-gray-100 disabled:opacity-30"
                    >
                      <svg
                        className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M21.015 4.356v4.992" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => searchListings()}
                    disabled={isSearching}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-sans text-xs font-medium transition-all disabled:opacity-30 flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 active:scale-[0.97]"
                  >
                    {isSearching ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                      </svg>
                    )}
                    search
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {DISTANCE_OPTIONS.map(opt => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setDistanceFilter(opt.value)}
                    className={`rounded-full px-4 py-2 font-sans text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
                      distanceFilter === opt.value
                        ? 'bg-[#C41E2A] text-white shadow-sm shadow-[#C41E2A]/30'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Secondary filters toggle + sort */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-gray-500 font-sans text-[10px] uppercase tracking-wider whitespace-nowrap">
                      sort by
                    </label>
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans text-xs focus:ring-2 focus:ring-[#C41E2A]/50 focus:border-[#C41E2A]/50 transition-all"
                    >
                      <option value="distance-asc">Distance (nearest)</option>
                      <option value="price-asc">Price (low to high)</option>
                      <option value="price-desc">Price (high to low)</option>
                      <option value="beds-desc">Bedrooms</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className="text-gray-500 hover:text-gray-700 font-sans text-xs transition-colors flex items-center gap-1"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                    {showFilters ? 'less filters' : 'more filters'}
                  </button>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setPriceMin('')
                      setPriceMax('')
                      setBedsMin('')
                      setBathsMin('')
                      setPropType('')
                    }}
                    className="text-gray-400 hover:text-gray-600 font-sans text-xs transition-colors"
                  >
                    clear filters
                  </button>
                )}
              </div>

              {/* Collapsible secondary filters — NO "sold within" for on-market */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
                      <div>
                        <label className={labelClasses}>min price</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-sans text-xs">$</span>
                          <input
                            type="text"
                            value={priceMin}
                            onChange={e => setPriceMin(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-full pl-7 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans text-sm placeholder-gray-400 focus:ring-2 focus:ring-[#C41E2A]/50 focus:border-[#C41E2A]/50 transition-all"
                            placeholder="Any"
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClasses}>max price</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-sans text-xs">$</span>
                          <input
                            type="text"
                            value={priceMax}
                            onChange={e => setPriceMax(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-full pl-7 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans text-sm placeholder-gray-400 focus:ring-2 focus:ring-[#C41E2A]/50 focus:border-[#C41E2A]/50 transition-all"
                            placeholder="Any"
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClasses}>bedrooms</label>
                        <select
                          value={bedsMin}
                          onChange={e => setBedsMin(e.target.value)}
                          className={selectClasses}
                        >
                          <option value="">Any</option>
                          <option value="1">1+</option>
                          <option value="2">2+</option>
                          <option value="3">3+</option>
                          <option value="4">4+</option>
                          <option value="5">5+</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClasses}>bathrooms</label>
                        <select
                          value={bathsMin}
                          onChange={e => setBathsMin(e.target.value)}
                          className={selectClasses}
                        >
                          <option value="">Any</option>
                          <option value="1">1+</option>
                          <option value="2">2+</option>
                          <option value="3">3+</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClasses}>property type</label>
                        <select
                          value={propType}
                          onChange={e => setPropType(e.target.value)}
                          className={selectClasses}
                        >
                          <option value="">Any</option>
                          <option value="house">House</option>
                          <option value="unit">Unit</option>
                          <option value="townhouse">Townhouse</option>
                          <option value="land">Land</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Status message */}
            {statusMessage && (
              <div
                className={`px-5 py-2.5 border-t border-gray-200 ${
                  statusMessage.startsWith('Found')
                    ? 'bg-emerald-50'
                    : statusMessage === 'Searching...' || statusMessage === 'Refreshing data...'
                      ? 'bg-gray-50'
                      : 'bg-amber-50'
                }`}
              >
                <p
                  className={`font-sans text-xs font-light ${
                    statusMessage.startsWith('Found')
                      ? 'text-emerald-700'
                      : statusMessage === 'Searching...' || statusMessage === 'Refreshing data...'
                        ? 'text-gray-500'
                        : 'text-amber-700'
                  }`}
                >
                  {statusMessage}
                </p>
              </div>
            )}

            {dataSource && (
              <div className="px-5 py-1.5 border-t border-gray-100 flex items-center gap-1.5">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    isCached ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <p className="text-gray-400 font-sans text-[10px]">
                  {isCached
                    ? `From local cache${cacheAge ? ` (updated ${cacheAge})` : ''}`
                    : `Live data from ${dataSource}${cacheAge ? ` — updated ${cacheAge}` : ''}`}
                </p>
              </div>
            )}
          </div>

          {/* ═══════ ON-MARKET RESULTS ═══════ */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-200 bg-gray-50">
              <span className="flex items-center gap-2 font-sans text-sm font-medium text-gray-900">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
                </svg>
                on-market listings
                {onMarketRows.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 text-[10px] font-medium">
                    {onMarketRows.filter(r => r.included).length}/{onMarketRows.length}
                  </span>
                )}
              </span>
            </div>

            <div className="p-5">
              {/* Empty state */}
              {onMarketRows.length === 0 && rawOnMarket.length === 0 && !isSearching && (
                <div className="text-center py-10">
                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
                  </svg>
                  <p className="text-gray-400 font-sans text-sm">
                    no on-market listings found
                  </p>
                  <p className="text-gray-300 font-sans text-xs mt-1">
                    try increasing the distance or adjusting filters
                  </p>
                </div>
              )}

              {/* All filtered out */}
              {onMarketRows.length === 0 && rawOnMarket.length > 0 && (
                <div className="text-center py-8">
                  <p className="text-amber-600 font-sans text-sm">
                    all {rawOnMarket.length} results filtered out
                  </p>
                  <p className="text-gray-400 font-sans text-xs mt-1">
                    try increasing the distance or broadening your filters
                  </p>
                </div>
              )}

              {/* Loading */}
              {isSearching && onMarketRows.length === 0 && (
                <div className="flex flex-col items-center py-10 gap-3">
                  <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                  <p className="text-gray-500 font-sans text-sm">searching listings...</p>
                </div>
              )}

              {/* Results */}
              <div className="space-y-2">
                {onMarketRows.map((row, index) => (
                  <motion.div
                    key={`buy-${index}-${row.address}`}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                    className={`group rounded-xl border p-4 transition-all duration-200 ${
                      row.included
                        ? 'bg-white border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                        : 'bg-gray-50 border-gray-100 opacity-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => updateOnMarketRow(index, 'included', row.included ? '' : 'true')}
                        className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                          row.included
                            ? 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-500/30'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {row.included && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </button>

                      {/* Thumbnail */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 shadow-sm relative">
                        {row.imageUrl && !imageErrors.has(row.imageUrl) ? (
                          <img
                            src={row.imageUrl}
                            alt={row.address}
                            loading="lazy"
                            className="w-full h-full object-cover"
                            onError={() => {
                              setImageErrors(prev => new Set(prev).add(row.imageUrl))
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
                            </svg>
                          </div>
                        )}
                        {row.distance !== undefined && (
                          <span className="absolute top-1 left-1 text-xs font-medium bg-red-50 text-[#C41E2A] rounded-full px-2 py-0.5 shadow-sm">
                            {formatDistance(row.distance)}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <p className="text-gray-900 font-sans text-sm font-medium leading-snug">
                              {row.address}
                            </p>
                            <p className="text-emerald-600 font-sans text-base font-bold whitespace-nowrap">
                              {row.askingPrice}
                            </p>
                          </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="flex items-center gap-1 text-gray-500 font-sans text-xs">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z" />
                                </svg>
                                {row.bedrooms}
                              </span>
                              <span className="flex items-center gap-1 text-gray-500 font-sans text-xs">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M7 7a2 2 0 0 1 2-2h1a1 1 0 0 1 0 2H9v1h11a3 3 0 0 1 3 3v2a5 5 0 0 1-4 4.9V19a1 1 0 0 1-2 0v-1H7v1a1 1 0 0 1-2 0v-1.1A5 5 0 0 1 1 13v-2a1 1 0 0 1 1-1h5V7Z" />
                                </svg>
                                {row.bathrooms}
                              </span>
                              {row.cars !== '0' && (
                                <span className="flex items-center gap-1 text-gray-500 font-sans text-xs">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                                  </svg>
                                  {row.cars}
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-sans text-[10px] uppercase tracking-wider">
                                {row.propertyType}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600/70 font-sans text-[10px] font-medium">
                                on market
                              </span>
                            </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => removeOnMarketRow(index)}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded hover:bg-gray-100"
                          title="Remove"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Add listing manually */}
              <button
                type="button"
                onClick={() => {
                  resetManualForm()
                  setShowManualOnMarket(true)
                }}
                className="flex items-center gap-2 text-gray-400 hover:text-gray-600 font-sans text-xs transition-colors pt-3 mt-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                add listing manually
              </button>

              {/* Manual add on-market form */}
              <AnimatePresence>
                {showManualOnMarket && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                      <p className="text-gray-500 font-sans text-xs uppercase tracking-wider">
                        add on-market listing
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className={labelClasses}>address</label>
                          <input
                            type="text"
                            value={manualAddress}
                            onChange={e => setManualAddress(e.target.value)}
                            className={inputClasses}
                            placeholder="e.g. 15 Oak Ave, Pakenham VIC 3810"
                          />
                        </div>
                        <div>
                          <label className={labelClasses}>asking price</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-sans text-xs">$</span>
                            <input
                              type="text"
                              value={manualPrice}
                              onChange={e => setManualPrice(e.target.value.replace(/[^0-9]/g, ''))}
                              className="w-full pl-7 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans text-sm placeholder-gray-400 focus:ring-2 focus:ring-[#C41E2A]/50 focus:border-[#C41E2A]/50 transition-all"
                              placeholder="e.g. 750000"
                            />
                          </div>
                        </div>
                        <div>
                          <label className={labelClasses}>type</label>
                          <select value={manualType} onChange={e => setManualType(e.target.value)} className={selectClasses}>
                            <option value="House">House</option>
                            <option value="Unit">Unit</option>
                            <option value="Townhouse">Townhouse</option>
                            <option value="Land">Land</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelClasses}>beds</label>
                          <input type="number" value={manualBeds} onChange={e => setManualBeds(e.target.value)} className={inputClasses} placeholder="3" min="0" />
                        </div>
                        <div>
                          <label className={labelClasses}>baths</label>
                          <input type="number" value={manualBaths} onChange={e => setManualBaths(e.target.value)} className={inputClasses} placeholder="2" min="0" />
                        </div>
                        <div>
                          <label className={labelClasses}>cars</label>
                          <input type="number" value={manualCars} onChange={e => setManualCars(e.target.value)} className={inputClasses} placeholder="2" min="0" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={addManualOnMarket}
                          disabled={!manualAddress.trim()}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-sans text-xs font-medium transition-all disabled:opacity-30 active:scale-[0.97]"
                        >
                          add listing
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowManualOnMarket(false)}
                          className="px-4 py-2 text-gray-400 hover:text-gray-600 font-sans text-xs transition-colors"
                        >
                          cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ═══════ SELECTION SUMMARY ═══════ */}
          {selectedOnMarketCount > 0 && (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-gray-50 border border-gray-200 rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-500 font-sans text-xs uppercase tracking-wider">
                  selection summary
                </p>
                <p className="text-gray-500 font-sans text-xs">
                  {selectedOnMarketCount} on-market listings selected
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {onMarketRows
                  .filter(r => r.included && r.address.trim())
                  .map((row, idx) => (
                    <span
                      key={`summary-buy-${idx}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-gray-700 font-sans text-[11px] group"
                    >
                      <span className="truncate max-w-[180px]">
                        {row.address.split(',')[0]}
                      </span>
                      <span className="text-emerald-600/60 text-[10px] font-medium">
                        {row.askingPrice ? fmtPrice(row.askingPrice) : 'Contact Agent'}
                      </span>
                      {row.distance !== undefined && (
                        <span className="text-gray-400 text-[10px]">
                          {formatDistance(row.distance)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const realIdx = onMarketRows.findIndex(
                            r => r === row || (r.address === row.address && r.included)
                          )
                          if (realIdx >= 0) updateOnMarketRow(realIdx, 'included', '')
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors ml-0.5"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
              </div>
            </motion.div>
          )}

          {/* Warning if no listings selected */}
          {selectedOnMarketCount === 0 && hasSearchedRef.current && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <p className="text-amber-700 font-sans text-xs">
                No on-market listings selected. This is optional but adds strength to your proposal.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}

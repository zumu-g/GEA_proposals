'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ComparableRow {
  address: string
  price: string
  beds: string
  baths: string
  cars?: string
  sqft?: string
  date?: string
  distance?: string
  url?: string
  imageUrl?: string
  propertyType?: string
  included?: boolean
}

interface SoldPropertiesStepProps {
  propertyAddress: string
  soldComparables: ComparableRow[]
  onChangeSold: (rows: ComparableRow[]) => void
  onConfirmAddress?: (address: string, lat: number | null, lng: number | null) => void
}

// ─── Internal row type ───────────────────────────────────────────────────────

interface InternalSoldRow {
  address: string
  price: string
  date: string
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

interface AddressSuggestion {
  display: string
  suburb: string
  state: string
  postcode: string
  streetAddress: string
  fullAddress: string
}

// ─── Validation ──────────────────────────────────────────────────────────────

export function validateSoldProperties(sold: ComparableRow[]): string | null {
  const includedSold = sold.filter(r => r.included && r.address.trim())
  if (includedSold.length === 0) {
    return 'At least 1 sold comparable is required. Search and select properties above.'
  }
  return null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtPrice(val: string): string {
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

function isCompleteAddress(addr: string): boolean {
  return /[A-Z]{2,3}\s+\d{4}\s*$/.test(addr.trim())
}

// ─── Conversion helpers ─────────────────────────────────────────────────────

function soldToExternal(row: InternalSoldRow): ComparableRow {
  return {
    address: row.address,
    price: row.price,
    beds: row.bedrooms,
    baths: row.bathrooms,
    cars: row.cars,
    date: row.date,
    distance: row.distance !== undefined ? String(row.distance) : undefined,
    url: row.url,
    imageUrl: row.imageUrl || undefined,
    propertyType: row.propertyType,
    included: row.included,
  }
}

function externalToSold(row: ComparableRow): InternalSoldRow {
  return {
    address: row.address,
    price: row.price,
    date: row.date || '',
    bedrooms: row.beds,
    bathrooms: row.baths,
    cars: row.cars || '0',
    propertyType: row.propertyType || 'House',
    url: row.url || '',
    imageUrl: row.imageUrl || '',
    included: row.included ?? true,
    distance: row.distance ? parseFloat(row.distance) : undefined,
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

export default function SoldPropertiesStep({
  propertyAddress,
  soldComparables,
  onChangeSold,
  onConfirmAddress,
}: SoldPropertiesStepProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    setPrefersReducedMotion(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }, [])

  // ─── Address confirmation state ─────────────────────────────────────────
  const [confirmedAddress, setConfirmedAddress] = useState('')
  const [addressInput, setAddressInput] = useState('')
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const suggestDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const addressInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // ─── Subject lat/lng ───────────────────────────────────────────────────
  const [subjectLat, setSubjectLat] = useState<number | null>(null)
  const [subjectLng, setSubjectLng] = useState<number | null>(null)

  // ─── Internal state ────────────────────────────────────────────────────
  const [compRows, setCompRows] = useState<InternalSoldRow[]>(
    soldComparables.map(externalToSold)
  )

  // Raw unfiltered results
  const [rawComps, setRawComps] = useState<any[]>([])

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
  const [showFilters, setShowFilters] = useState(true)
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [bedsMin, setBedsMin] = useState('')
  const [bathsMin, setBathsMin] = useState('')
  const [propType, setPropType] = useState('')
  const [soldWithin, setSoldWithin] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('distance-asc')

  // Image error tracking
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Exclusion tracking
  const excludedSoldRef = useRef<Set<string>>(new Set())
  const removedSoldRef = useRef<Set<string>>(new Set())

  // Manual add
  const [showManualSold, setShowManualSold] = useState(false)
  const [manualAddress, setManualAddress] = useState('')
  const [manualPrice, setManualPrice] = useState('')
  const [manualBeds, setManualBeds] = useState('')
  const [manualBaths, setManualBaths] = useState('')
  const [manualCars, setManualCars] = useState('')
  const [manualDate, setManualDate] = useState('')
  const [manualType, setManualType] = useState('House')

  // ─── Sync internal state to parent ────────────────────────────────────
  const syncSoldRef = useRef(onChangeSold)
  syncSoldRef.current = onChangeSold

  useEffect(() => {
    syncSoldRef.current(compRows.map(soldToExternal))
  }, [compRows])

  // ─── Notify parent of confirmed address ────────────────────────────────
  const onConfirmAddressRef = useRef(onConfirmAddress)
  onConfirmAddressRef.current = onConfirmAddress

  useEffect(() => {
    if (confirmedAddress) {
      onConfirmAddressRef.current?.(confirmedAddress, subjectLat, subjectLng)
    }
  }, [confirmedAddress, subjectLat, subjectLng])

  // ─── Auto-confirm address on mount ────────────────────────────────────
  useEffect(() => {
    if (propertyAddress && isCompleteAddress(propertyAddress) && !confirmedAddress) {
      setConfirmedAddress(propertyAddress)
    } else if (propertyAddress && !confirmedAddress) {
      setAddressInput(propertyAddress)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Address suggestion fetching (debounced) ──────────────────────────
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setAddressSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsLoadingSuggestions(true)
    try {
      const res = await fetch(`/api/address-suggest?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (data.suggestions && data.suggestions.length > 0) {
        setAddressSuggestions(data.suggestions.slice(0, 8))
        setShowSuggestions(true)
      } else {
        setAddressSuggestions([])
        setShowSuggestions(false)
      }
    } catch {
      setAddressSuggestions([])
    } finally {
      setIsLoadingSuggestions(false)
    }
  }, [])

  const handleAddressInputChange = useCallback(
    (value: string) => {
      setAddressInput(value)
      if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current)
      suggestDebounceRef.current = setTimeout(() => {
        fetchSuggestions(value)
      }, 300)
    },
    [fetchSuggestions]
  )

  const handleSelectSuggestion = useCallback((suggestion: AddressSuggestion) => {
    setConfirmedAddress(suggestion.fullAddress)
    setSubjectLat(null)
    setSubjectLng(null)
    setAddressInput('')
    setShowSuggestions(false)
    setAddressSuggestions([])
  }, [])

  const handleConfirmTypedAddress = useCallback(() => {
    if (addressInput.trim()) {
      setConfirmedAddress(addressInput.trim())
      setSubjectLat(null)
      setSubjectLng(null)
      setAddressInput('')
      setShowSuggestions(false)
      setAddressSuggestions([])
    }
  }, [addressInput])

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        addressInputRef.current &&
        !addressInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ─── Apply filters + sorting (client-side) ────────────────────────────
  const applyFilters = useCallback(
    (sold: any[]) => {
      const sLat = subjectLat
      const sLng = subjectLng

      let filteredSold = sold.filter((s: any) => {
        if (removedSoldRef.current.has(s.address || '')) return false
        if (distanceFilter !== Infinity && sLat && sLng && s.lat && s.lng) {
          const dist = haversineKm(sLat, sLng, s.lat, s.lng)
          if (dist > distanceFilter) return false
        }
        if (bedsMin && Number(s.bedrooms) < Number(bedsMin)) return false
        if (bathsMin && Number(s.bathrooms) < Number(bathsMin)) return false
        if (priceMin && Number(s.price) < Number(priceMin)) return false
        if (priceMax && Number(s.price) > Number(priceMax)) return false
        if (
          propType &&
          s.propertyType &&
          !s.propertyType.toLowerCase().includes(propType.toLowerCase())
        )
          return false
        if (soldWithin && s.date) {
          const saleDate = new Date(s.date)
          const now = new Date()
          const months = Number(soldWithin)
          const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate())
          if (saleDate < cutoff) return false
        }
        if (dateFrom && s.date) {
          const saleDate = new Date(s.date)
          const from = new Date(dateFrom)
          if (saleDate < from) return false
        }
        if (dateTo && s.date) {
          const saleDate = new Date(s.date)
          const to = new Date(dateTo)
          to.setHours(23, 59, 59, 999)
          if (saleDate > to) return false
        }
        return true
      })

      filteredSold.sort((a: any, b: any) => {
        switch (sortBy) {
          case 'distance-asc':
            if (sLat && sLng) {
              const distA = a.lat && a.lng ? haversineKm(sLat, sLng, a.lat, a.lng) : 999
              const distB = b.lat && b.lng ? haversineKm(sLat, sLng, b.lat, b.lng) : 999
              return distA - distB
            }
            return 0
          case 'price-asc':
            return (Number(a.price) || 0) - (Number(b.price) || 0)
          case 'price-desc':
            return (Number(b.price) || 0) - (Number(a.price) || 0)
          case 'date-desc':
            return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
          case 'beds-desc':
            return (Number(b.bedrooms) || 0) - (Number(a.bedrooms) || 0)
          default:
            return 0
        }
      })

      setCompRows(
        filteredSold.map((s: any) => {
          const dist =
            sLat && sLng && s.lat && s.lng
              ? haversineKm(sLat, sLng, s.lat, s.lng)
              : undefined
          const addr = s.address || ''
          return {
            address: addr,
            price: s.price ? String(s.price) : '',
            date: s.date || '',
            bedrooms: s.bedrooms ? String(s.bedrooms) : '',
            bathrooms: s.bathrooms ? String(s.bathrooms) : '',
            cars: s.cars ? String(s.cars) : '0',
            propertyType: s.propertyType || 'House',
            url: s.url || '',
            imageUrl: s.imageUrl || '',
            included: !excludedSoldRef.current.has(addr),
            distance: dist,
            lat: s.lat,
            lng: s.lng,
          }
        })
      )

      const soldCount = filteredSold.length

      // If distance filter produced 0 results but we have data, show helpful message
      if (soldCount === 0 && sold.length > 0 && distanceFilter !== Infinity && sLat && sLng) {
        // Find the nearest property to suggest a better distance
        let nearest = Infinity
        for (const s of sold) {
          if (s.lat && s.lng) {
            const dist = haversineKm(sLat, sLng, s.lat, s.lng)
            if (dist < nearest) nearest = dist
          }
        }
        const suggestedDist = nearest < 1 ? '1km' : nearest < 2 ? '2km' : nearest < 5 ? '5km' : '10km'
        setStatusMessage(
          `No properties within ${distanceFilter < 1 ? `${distanceFilter * 1000}m` : `${distanceFilter}km`} — nearest is ${formatDistance(nearest)} away. Try ${suggestedDist}.`
        )
      } else {
        setStatusMessage(
          `Found ${soldCount} sold properties${soldCount < sold.length ? ` (from ${sold.length})` : ''}`
        )
      }
    },
    [distanceFilter, bedsMin, bathsMin, priceMin, priceMax, propType, soldWithin, dateFrom, dateTo, sortBy, subjectLat, subjectLng]
  )

  // Re-apply filters when filter values change
  useEffect(() => {
    if (rawComps.length > 0) {
      applyFilters(rawComps)
    }
  }, [distanceFilter, bedsMin, bathsMin, priceMin, priceMax, propType, soldWithin, dateFrom, dateTo, sortBy, subjectLat, subjectLng, rawComps, applyFilters])

  // ─── Search function ──────────────────────────────────────────────────
  const searchComparables = useCallback(
    async (searchAddress?: string) => {
      const addr = searchAddress || confirmedAddress
      if (!addr) return
      if (isSearching) return

      const suburb = extractSuburb(addr)
      setIsSearching(true)
      setStatusMessage('Searching...')
      excludedSoldRef.current.clear()
      removedSoldRef.current.clear()

      try {
        const soldRes = await fetch(`/api/comparables?address=${encodeURIComponent(suburb)}`)
        const soldData = await soldRes.json()

        if (soldData.error) {
          setStatusMessage(`Search failed: ${soldData.error}`)
          setIsSearching(false)
          return
        }

        const sold = soldData.sales || []
        setRawComps(sold)

        const src = soldData.source || ''
        setDataSource(src)
        setIsCached(!!soldData.cached)
        setCacheAge(soldData.cacheAge || '')

        // Geocode the actual subject property for accurate distances
        if (!subjectLat || !subjectLng) {
          try {
            const geoRes = await fetch(`/api/geocode?address=${encodeURIComponent(addr)}`)
            const geoData = await geoRes.json()
            if (geoData.lat && geoData.lng) {
              setSubjectLat(geoData.lat)
              setSubjectLng(geoData.lng)
            } else {
              // Fallback: geocode just the suburb for approximate distances
              const suburbWithState = `${suburb} VIC`
              const fallbackRes = await fetch(`/api/geocode?address=${encodeURIComponent(suburbWithState)}`)
              const fallbackData = await fallbackRes.json()
              if (fallbackData.lat && fallbackData.lng) {
                setSubjectLat(fallbackData.lat)
                setSubjectLng(fallbackData.lng)
                console.log(`[SoldPropertiesStep] Using suburb centroid for ${suburb}`)
              }
            }
          } catch {
            console.warn('[SoldPropertiesStep] Geocoding failed for subject property')
          }
        }

        if (sold.length === 0) {
          setStatusMessage(
            `No sold properties found for "${suburb}". Try a different address.`
          )
        } else {
          applyFilters(sold)
        }
      } catch (err) {
        setStatusMessage(
          `Search failed: ${err instanceof Error ? err.message : 'network error'}`
        )
      }
      setIsSearching(false)
      hasSearchedRef.current = true
    },
    [confirmedAddress, isSearching, applyFilters, subjectLat, subjectLng]
  )

  // ─── Refresh function ─────────────────────────────────────────────────
  const refreshComparables = useCallback(async () => {
    const addr = confirmedAddress
    if (!addr || isRefreshing || isSearching) return

    const suburb = extractSuburb(addr)
    setIsRefreshing(true)
    setStatusMessage('Refreshing from homely...')
    excludedSoldRef.current.clear()
    removedSoldRef.current.clear()

    try {
      const soldRes = await fetch(`/api/comparables?address=${encodeURIComponent(suburb)}&refresh=true`)
      const soldData = await soldRes.json()

      if (soldData.error) {
        setStatusMessage(`Refresh failed: ${soldData.error}`)
        setIsRefreshing(false)
        return
      }

      const sold = soldData.sales || []
      setRawComps(sold)

      const src = soldData.source || ''
      setDataSource(src)
      setIsCached(false)
      setCacheAge('just now')

      // Geocode the subject property if not already done
      if (!subjectLat || !subjectLng) {
        try {
          const geoRes = await fetch(`/api/geocode?address=${encodeURIComponent(addr)}`)
          const geoData = await geoRes.json()
          if (geoData.lat && geoData.lng) {
            setSubjectLat(geoData.lat)
            setSubjectLng(geoData.lng)
          } else {
            const suburbWithState = `${suburb} VIC`
            const fallbackRes = await fetch(`/api/geocode?address=${encodeURIComponent(suburbWithState)}`)
            const fallbackData = await fallbackRes.json()
            if (fallbackData.lat && fallbackData.lng) {
              setSubjectLat(fallbackData.lat)
              setSubjectLng(fallbackData.lng)
            }
          }
        } catch {
          console.warn('[SoldPropertiesStep] Geocoding failed on refresh')
        }
      }

      if (sold.length === 0) {
        setStatusMessage(`No sold properties found on refresh.`)
      } else {
        applyFilters(sold)
      }
    } catch (err) {
      setStatusMessage(
        `Refresh failed: ${err instanceof Error ? err.message : 'network error'}`
      )
    }
    setIsRefreshing(false)
  }, [confirmedAddress, isRefreshing, isSearching, applyFilters])

  // ─── Track confirmed address changes (no auto-search — user clicks "search") ──
  const prevConfirmedRef = useRef('')
  useEffect(() => {
    if (confirmedAddress && confirmedAddress !== prevConfirmedRef.current) {
      prevConfirmedRef.current = confirmedAddress
      // Reset results when address changes so user starts fresh
      setCompRows([])
      setRawComps([])
      setStatusMessage('')
      hasSearchedRef.current = false
    }
  }, [confirmedAddress])

  // ─── Row manipulation ─────────────────────────────────────────────────
  const updateCompRow = (index: number, field: keyof InternalSoldRow, value: string) => {
    setCompRows(prev =>
      prev.map((r, i) => {
        if (i !== index) return r
        const updated = { ...r, [field]: field === 'included' ? !!value : value }
        if (field === 'included') {
          if (!value) {
            excludedSoldRef.current.add(r.address)
          } else {
            excludedSoldRef.current.delete(r.address)
          }
        }
        return updated
      })
    )
  }

  const removeCompRow = (index: number) => {
    setCompRows(prev => {
      const row = prev[index]
      if (row) removedSoldRef.current.add(row.address)
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
    setManualDate('')
    setManualType('House')
  }

  const addManualSold = () => {
    if (!manualAddress.trim()) return
    setCompRows(prev => [
      ...prev,
      {
        address: manualAddress.trim(),
        price: manualPrice,
        date: manualDate,
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
    setShowManualSold(false)
  }

  // ─── Counts ───────────────────────────────────────────────────────────
  const selectedSoldCount = compRows.filter(r => r.included && r.address.trim()).length

  const hasActiveFilters = !!(priceMin || priceMax || bedsMin || bathsMin || propType || soldWithin || dateFrom || dateTo)

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
          sold properties
        </h2>
        <p className="text-gray-500 font-sans text-sm mt-1">
          confirm your property address, then search for comparable sales by distance
        </p>
      </div>

      {/* ═══════ STEP A: ADDRESS CONFIRMATION ═══════ */}
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
          </div>

          {confirmedAddress ? (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg"
            >
              <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p className="text-gray-900 font-sans text-sm font-medium flex-1">
                {confirmedAddress}
              </p>
              <button
                type="button"
                onClick={() => {
                  setConfirmedAddress('')
                  setSubjectLat(null)
                  setSubjectLng(null)
                  setAddressInput(confirmedAddress)
                  setTimeout(() => addressInputRef.current?.focus(), 100)
                }}
                className="text-green-700 hover:text-green-900 font-sans text-xs font-medium transition-colors"
              >
                change
              </button>
            </motion.div>
          ) : (
            <div className="relative">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <input
                  ref={addressInputRef}
                  type="text"
                  value={addressInput}
                  onChange={e => handleAddressInputChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleConfirmTypedAddress()
                    }
                  }}
                  onFocus={() => {
                    if (addressSuggestions.length > 0) setShowSuggestions(true)
                  }}
                  className="w-full pl-9 pr-3 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans text-sm placeholder-gray-400 focus:ring-2 focus:ring-[#C41E2A]/50 focus:border-[#C41E2A]/50 transition-all"
                  placeholder="Start typing an address to search..."
                  autoComplete="off"
                />
                {isLoadingSuggestions && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  </div>
                )}
              </div>

              <AnimatePresence>
                {showSuggestions && addressSuggestions.length > 0 && (
                  <motion.div
                    ref={suggestionsRef}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-50 w-full mt-1 bg-white shadow-lg rounded-lg border border-gray-200 overflow-hidden"
                  >
                    {addressSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <p className="text-gray-900 font-sans text-sm">
                          {suggestion.streetAddress}
                        </p>
                        <p className="text-gray-500 font-sans text-xs mt-0.5">
                          {suggestion.suburb} {suggestion.state} {suggestion.postcode}
                        </p>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {addressInput.trim().length >= 3 && !showSuggestions && (
                <p className="text-gray-400 font-sans text-xs mt-2">
                  press enter to confirm, or select from the suggestions above
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════ STEP B: DISTANCE-FIRST SEARCH ═══════ */}
      <AnimatePresence>
        {confirmedAddress && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
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
                    {rawComps.length > 0 && (
                      <button
                        type="button"
                        onClick={refreshComparables}
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
                      onClick={() => searchComparables()}
                      disabled={isSearching}
                      className="px-4 py-1.5 bg-[#C41E2A] hover:bg-[#a81823] rounded-lg text-white font-sans text-xs font-medium transition-all disabled:opacity-30 flex items-center gap-1.5 shadow-sm shadow-[#C41E2A]/20 active:scale-[0.97]"
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
                        <option value="date-desc">Date (newest)</option>
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
                        setSoldWithin('')
                        setDateFrom('')
                        setDateTo('')
                      }}
                      className="text-gray-400 hover:text-gray-600 font-sans text-xs transition-colors"
                    >
                      clear filters
                    </button>
                  )}
                </div>

                {/* Collapsible secondary filters */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mt-3">
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
                        <div>
                          <label className={labelClasses}>sold within</label>
                          <select
                            value={soldWithin}
                            onChange={e => {
                              setSoldWithin(e.target.value)
                              if (e.target.value) { setDateFrom(''); setDateTo('') }
                            }}
                            className={selectClasses}
                          >
                            <option value="">Any time</option>
                            <option value="3">Last 3 months</option>
                            <option value="6">Last 6 months</option>
                            <option value="12">Last 12 months</option>
                            <option value="24">Last 24 months</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelClasses}>date from</label>
                          <input
                            type="date"
                            value={dateFrom}
                            onChange={e => { setDateFrom(e.target.value); if (e.target.value) setSoldWithin('') }}
                            className={inputClasses}
                          />
                        </div>
                        <div>
                          <label className={labelClasses}>date to</label>
                          <input
                            type="date"
                            value={dateTo}
                            onChange={e => { setDateTo(e.target.value); if (e.target.value) setSoldWithin('') }}
                            className={inputClasses}
                          />
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

            {/* ═══════ SOLD RESULTS ═══════ */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-200 bg-gray-50">
                <span className="flex items-center gap-2 font-sans text-sm font-medium text-gray-900">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  sold properties
                  {compRows.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 rounded-full bg-[#C41E2A]/20 text-[#C41E2A] text-[10px] font-medium">
                      {compRows.filter(r => r.included).length}/{compRows.length}
                    </span>
                  )}
                </span>
              </div>

              <div className="p-5">
                {/* Empty state */}
                {compRows.length === 0 && rawComps.length === 0 && !isSearching && (
                  <div className="text-center py-10">
                    <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <p className="text-gray-400 font-sans text-sm">
                      no comparable sales found
                    </p>
                    <p className="text-gray-300 font-sans text-xs mt-1">
                      try increasing the distance or adjusting filters
                    </p>
                  </div>
                )}

                {/* All filtered out */}
                {compRows.length === 0 && rawComps.length > 0 && (
                  <div className="text-center py-8">
                    <p className="text-amber-600 font-sans text-sm">
                      all {rawComps.length} results filtered out
                    </p>
                    <p className="text-gray-400 font-sans text-xs mt-1">
                      try increasing the distance or broadening your filters
                    </p>
                  </div>
                )}

                {/* Loading */}
                {isSearching && compRows.length === 0 && (
                  <div className="flex flex-col items-center py-10 gap-3">
                    <div className="w-8 h-8 border-2 border-[#C41E2A]/30 border-t-[#C41E2A] rounded-full animate-spin" />
                    <p className="text-gray-500 font-sans text-sm">searching properties...</p>
                  </div>
                )}

                {/* Results */}
                <div className="space-y-2">
                  {compRows.map((row, index) => (
                    <motion.div
                      key={`sold-${index}-${row.address}`}
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                      className={`group rounded-xl border p-4 transition-all duration-200 ${
                        row.included
                          ? 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          : 'bg-gray-50 border-gray-100 opacity-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => updateCompRow(index, 'included', row.included ? '' : 'true')}
                          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                            row.included
                              ? 'bg-[#C41E2A] border-[#C41E2A] shadow-sm shadow-[#C41E2A]/30'
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
                              <p className="text-[#C41E2A] font-sans text-base font-bold whitespace-nowrap">
                                {fmtPrice(row.price)}
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
                                {row.distance !== undefined && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-sans text-[10px] font-medium">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                                    </svg>
                                    {formatDistance(row.distance)}
                                  </span>
                                )}
                                {row.date && (
                                  <span className="px-2 py-0.5 rounded bg-[#C41E2A]/10 text-[#C41E2A]/70 font-sans text-[10px]">
                                    sold {row.date}
                                  </span>
                                )}
                              </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const p = prompt('Price:', row.price)
                              if (p !== null) updateCompRow(index, 'price', p)
                            }}
                            className="p-1.5 text-gray-300 hover:text-gray-600 transition-colors rounded hover:bg-gray-100"
                            title="Edit price"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCompRow(index)}
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

                {/* Add sale manually */}
                <button
                  type="button"
                  onClick={() => {
                    resetManualForm()
                    setShowManualSold(true)
                  }}
                  className="flex items-center gap-2 text-gray-400 hover:text-gray-600 font-sans text-xs transition-colors pt-3 mt-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  add sale manually
                </button>

                {/* Manual add sold form */}
                <AnimatePresence>
                  {showManualSold && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                        <p className="text-gray-500 font-sans text-xs uppercase tracking-wider">
                          add comparable sale
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2">
                            <label className={labelClasses}>address</label>
                            <input
                              type="text"
                              value={manualAddress}
                              onChange={e => setManualAddress(e.target.value)}
                              className={inputClasses}
                              placeholder="e.g. 42 Smith St, Berwick VIC 3806"
                            />
                          </div>
                          <div>
                            <label className={labelClasses}>sold price</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-sans text-xs">$</span>
                              <input
                                type="text"
                                value={manualPrice}
                                onChange={e => setManualPrice(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full pl-7 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans text-sm placeholder-gray-400 focus:ring-2 focus:ring-[#C41E2A]/50 focus:border-[#C41E2A]/50 transition-all"
                                placeholder="e.g. 850000"
                              />
                            </div>
                          </div>
                          <div>
                            <label className={labelClasses}>sold date</label>
                            <input
                              type="date"
                              value={manualDate}
                              onChange={e => setManualDate(e.target.value)}
                              className={inputClasses}
                            />
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
                          <div>
                            <label className={labelClasses}>type</label>
                            <select value={manualType} onChange={e => setManualType(e.target.value)} className={selectClasses}>
                              <option value="House">House</option>
                              <option value="Unit">Unit</option>
                              <option value="Townhouse">Townhouse</option>
                              <option value="Land">Land</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={addManualSold}
                            disabled={!manualAddress.trim()}
                            className="px-4 py-2 bg-[#C41E2A] hover:bg-[#a81823] rounded-lg text-white font-sans text-xs font-medium transition-all disabled:opacity-30 active:scale-[0.97]"
                          >
                            add sale
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowManualSold(false)}
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
            {selectedSoldCount > 0 && (
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
                    {selectedSoldCount} sold properties selected
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {compRows
                    .filter(r => r.included && r.address.trim())
                    .map((row, idx) => (
                      <span
                        key={`summary-sold-${idx}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-gray-700 font-sans text-[11px] group"
                      >
                        <span className="truncate max-w-[180px]">
                          {row.address.split(',')[0]}
                        </span>
                        <span className="text-[#C41E2A]/60 text-[10px] font-medium">
                          {fmtPrice(row.price)}
                        </span>
                        {row.distance !== undefined && (
                          <span className="text-gray-400 text-[10px]">
                            {formatDistance(row.distance)}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const realIdx = compRows.findIndex(
                              r => r === row || (r.address === row.address && r.included)
                            )
                            if (realIdx >= 0) updateCompRow(realIdx, 'included', '')
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

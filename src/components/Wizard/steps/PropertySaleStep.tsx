'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

interface PropertySaleStepProps {
  formData: {
    methodOfSale: string
    priceGuideMin: string
    priceGuideMax: string
    heroImage: File | null
    heroImageUrl: string
    commission: string
    showPriceRange: boolean
    showCommission: boolean
    propertyAddress: string
  }
  autoImages: string[]
  isFetchingImages?: boolean
  onChange: (field: string, value: any) => void
  onAutoFetchImages: () => void
}

const METHODS_OF_SALE = [
  {
    value: 'Auction',
    description: 'competitive bidding on auction day',
  },
  {
    value: 'Private Sale',
    description: 'offers accepted directly by the vendor',
  },
  {
    value: 'Expressions of Interest',
    description: 'written offers by a closing date',
  },
  {
    value: '',
    label: 'n/a',
    description: 'method to be confirmed',
  },
] as const

export function validatePropertySale(
  data: PropertySaleStepProps['formData']
): string | null {
  if (!data.methodOfSale && data.methodOfSale !== '') {
    // methodOfSale can be empty string (n/a) but must be explicitly set
  }
  if (!data.priceGuideMin && !data.priceGuideMax) {
    return 'at least one price guide value is required'
  }
  if (!data.commission) {
    return 'commission rate is required'
  }
  return null
}

export default function PropertySaleStep({
  formData,
  autoImages,
  isFetchingImages = false,
  onChange,
  onAutoFetchImages,
}: PropertySaleStepProps) {
  const prefersReducedMotion = useReducedMotion()

  const fadeUp = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: 'easeOut' },
      }

  const stagger = (i: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.35, ease: 'easeOut', delay: i * 0.06 },
        }

  const [useAutoImage, setUseAutoImage] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [heroPreview, setHeroPreview] = useState<string | null>(null)
  const [selectedAutoIndex, setSelectedAutoIndex] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasAutoImages = autoImages.length > 0

  // Reset selectedAutoIndex if autoImages changes and index is out of bounds
  useEffect(() => {
    if (selectedAutoIndex >= autoImages.length && autoImages.length > 0) {
      setSelectedAutoIndex(0)
    }
  }, [autoImages, selectedAutoIndex])

  // Revoke blob URL on unmount or when preview changes to prevent memory leak
  useEffect(() => {
    return () => {
      if (heroPreview) URL.revokeObjectURL(heroPreview)
    }
  }, [heroPreview])

  // Format currency for display
  const formatPrice = (val: string) => {
    if (!val) return ''
    const num = parseInt(val, 10)
    if (isNaN(num)) return val
    return num.toLocaleString('en-AU')
  }

  // Handle file drop / selection
  const handleFile = useCallback(
    (file: File) => {
      onChange('heroImage', file)
      // Revoke previous blob URL before creating new one
      if (heroPreview) URL.revokeObjectURL(heroPreview)
      const url = URL.createObjectURL(file)
      setHeroPreview(url)
      setUseAutoImage(false)
    },
    [onChange, heroPreview]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file && file.type.startsWith('image/')) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      e.target.value = ''
    },
    [handleFile]
  )

  const removeHeroImage = useCallback(() => {
    onChange('heroImage', null)
    onChange('heroImageUrl', '')
    if (heroPreview) URL.revokeObjectURL(heroPreview)
    setHeroPreview(null)
  }, [onChange, heroPreview])

  // Current hero display
  const displayHeroUrl = useAutoImage && hasAutoImages
    ? autoImages[selectedAutoIndex] || autoImages[0]
    : heroPreview || formData.heroImageUrl || null

  return (
    <div className="space-y-10">
      {/* Step heading */}
      <motion.div {...fadeUp}>
        <h2 className="font-display text-2xl sm:text-3xl text-[#1A1A1A] font-medium lowercase tracking-tight">
          property & sale details
        </h2>
        <p className="text-gray-500 font-sans text-sm mt-2">
          images, sale method, pricing, and commission
        </p>
      </motion.div>

      {/* ─── Auto-fetched property images ─── */}
      <motion.div {...stagger(0)} className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-gray-500 font-sans text-xs tracking-wider uppercase">
            property images
          </p>
          {!hasAutoImages && !isFetchingImages && formData.propertyAddress && (
            <button
              type="button"
              onClick={onAutoFetchImages}
              className="px-4 py-2 bg-brand/20 border border-brand/40 rounded text-brand text-sm font-sans font-medium hover:bg-brand/30 transition-colors min-h-[44px] flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              fetch images
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* Loading skeleton while fetching images */}
          {isFetchingImages && !hasAutoImages && (
            <motion.div
              key="loading-images"
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-4"
            >
              {/* Hero skeleton */}
              <div className="relative w-full h-[220px] rounded-lg bg-gray-200 animate-pulse overflow-hidden">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-3 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                  <p className="text-gray-500 font-sans text-sm">fetching property images...</p>
                </div>
              </div>
              {/* Thumbnail skeletons */}
              <div className="flex gap-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-16 h-16 flex-shrink-0 rounded-lg bg-gray-200 animate-pulse"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {hasAutoImages && (
            <motion.div
              key="auto-images"
              initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-gray-50 border border-gray-300 rounded-xl space-y-4">
                {/* Hero image preview */}
                <div className="relative w-full max-h-[220px] overflow-hidden rounded-lg shadow-md">
                  <img
                    src={autoImages[selectedAutoIndex] || autoImages[0]}
                    alt="Property"
                    className="w-full h-full max-h-[220px] object-cover"
                  />
                </div>

                {/* Gallery thumbnails */}
                {autoImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {autoImages.slice(0, 8).map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSelectedAutoIndex(i)
                          // Propagate selected auto image URL to parent for submission
                          onChange('selectedAutoImageUrl', autoImages[i])
                        }}
                        className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden shadow-sm transition-all duration-200 border ${
                          i === selectedAutoIndex
                            ? 'ring-2 ring-brand scale-105 border-brand'
                            : 'opacity-60 hover:opacity-100 border-gray-300'
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Gallery ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                    {autoImages.length > 8 && (
                      <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-gray-100 border border-gray-300 flex items-center justify-center">
                        <span className="text-gray-500 text-xs font-sans">
                          +{autoImages.length - 8}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Toggle auto-fetched */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={useAutoImage}
                        onChange={(e) => setUseAutoImage(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 rounded-full peer-checked:bg-brand transition-colors duration-200" />
                      <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-4" />
                    </div>
                    <span className="text-gray-600 font-sans text-sm group-hover:text-gray-900 transition-colors">
                      use auto-fetched image
                    </span>
                  </label>
                  <span className="text-gray-400 font-sans text-xs">
                    from realestate.com.au
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── Hero Image Upload ─── */}
      <motion.div {...stagger(1)} className="space-y-3">
        <label className="block text-sm font-sans font-medium text-gray-700 lowercase">
          hero image
          <span className="text-gray-400 text-xs ml-2">
            {hasAutoImages && useAutoImage
              ? 'override -- leave blank to use auto-fetched'
              : 'upload or paste URL'}
          </span>
        </label>

        {/* Preview */}
        <AnimatePresence>
          {displayHeroUrl && !useAutoImage && (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <div className="w-full max-h-[180px] overflow-hidden rounded-lg shadow-md">
                <img
                  src={displayHeroUrl}
                  alt="Hero preview"
                  className="w-full h-full max-h-[180px] object-cover"
                />
              </div>
              <button
                type="button"
                onClick={removeHeroImage}
                className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-colors min-w-[48px] min-h-[48px] -mt-2 -mr-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drag-and-drop zone */}
        {(!displayHeroUrl || useAutoImage) && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 min-h-[140px] ${
              isDragging
                ? 'border-brand bg-brand/10 scale-[1.01]'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
            }`}
          >
            <svg
              className={`w-8 h-8 transition-colors duration-200 ${
                isDragging ? 'text-brand' : 'text-gray-400'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="text-gray-500 font-sans text-sm text-center">
              {isDragging ? 'drop image here' : 'drag & drop an image, or click to browse'}
            </p>
            <p className="text-gray-400 font-sans text-xs">
              JPG, PNG, or WebP
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileInput}
              className="sr-only"
            />
          </div>
        )}

        {/* URL input */}
        <div className="flex items-center gap-3">
          <span className="text-gray-500 font-sans text-xs shrink-0">or paste URL</span>
          <input
            type="url"
            value={formData.heroImageUrl}
            onChange={(e) => {
              onChange('heroImageUrl', e.target.value)
              if (e.target.value) {
                setUseAutoImage(false)
                setHeroPreview(null)
              }
            }}
            className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans placeholder-gray-400 focus:ring-1 focus:ring-brand focus:border-brand text-base touch-manipulation transition-colors"
            placeholder="https://..."
          />
        </div>
      </motion.div>

      {/* ─── Divider ─── */}
      <div className="border-t border-gray-200" />

      {/* ─── Method of Sale ─── */}
      <motion.div {...stagger(2)} className="space-y-4">
        <p className="text-gray-500 font-sans text-xs tracking-wider uppercase">
          sale details
        </p>

        <label className="block text-sm font-sans font-medium text-gray-700 lowercase">
          method of sale
        </label>

        <div className="grid grid-cols-2 gap-3">
          {METHODS_OF_SALE.map((method, i) => {
            const isSelected = formData.methodOfSale === method.value
            const label = ('label' in method ? method.label : null) || method.value.toLowerCase()

            return (
              <motion.button
                key={method.value || 'na'}
                type="button"
                onClick={() => onChange('methodOfSale', method.value)}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 min-h-[48px] ${
                  isSelected
                    ? 'border-brand bg-red-50 shadow-sm shadow-brand/20'
                    : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                {/* Selection indicator */}
                <div
                  className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    isSelected ? 'border-brand bg-brand' : 'border-gray-300'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                <span
                  className={`block font-sans text-sm font-medium transition-colors duration-200 ${
                    isSelected ? 'text-gray-900' : 'text-gray-700'
                  }`}
                >
                  {label}
                </span>
                <span
                  className={`block font-sans text-xs mt-1 transition-colors duration-200 ${
                    isSelected ? 'text-gray-600' : 'text-gray-400'
                  }`}
                >
                  {method.description}
                </span>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* ─── Price Guide ─── */}
      <motion.div {...stagger(3)} className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-sans font-medium text-gray-700 lowercase">
            price guide
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <span className="text-gray-500 font-sans text-xs group-hover:text-gray-700 transition-colors">
              show on proposal
            </span>
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.showPriceRange}
                onChange={(e) => onChange('showPriceRange', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-300 rounded-full peer-checked:bg-brand transition-colors duration-200" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-4" />
            </div>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="wizard-priceGuideMin"
              className="block text-xs font-sans text-gray-500 mb-2 lowercase"
            >
              low
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-sans text-base">
                $
              </span>
              <input
                type="number"
                id="wizard-priceGuideMin"
                value={formData.priceGuideMin}
                onChange={(e) => onChange('priceGuideMin', e.target.value)}
                min="0"
                step="10000"
                className="w-full pl-8 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans placeholder-gray-400 focus:ring-1 focus:ring-brand focus:border-brand text-base touch-manipulation transition-colors"
                placeholder="800000"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="wizard-priceGuideMax"
              className="block text-xs font-sans text-gray-500 mb-2 lowercase"
            >
              high
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-sans text-base">
                $
              </span>
              <input
                type="number"
                id="wizard-priceGuideMax"
                value={formData.priceGuideMax}
                onChange={(e) => onChange('priceGuideMax', e.target.value)}
                min="0"
                step="10000"
                className="w-full pl-8 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans placeholder-gray-400 focus:ring-1 focus:ring-brand focus:border-brand text-base touch-manipulation transition-colors"
                placeholder="900000"
              />
            </div>
          </div>
        </div>

        {/* Live range preview */}
        {(formData.priceGuideMin || formData.priceGuideMax) && (
          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-gray-500 font-sans text-sm"
          >
            guide:{' '}
            <span className="text-gray-900 font-medium">
              {formData.priceGuideMin && `$${formatPrice(formData.priceGuideMin)}`}
              {formData.priceGuideMin && formData.priceGuideMax && ' — '}
              {formData.priceGuideMax && `$${formatPrice(formData.priceGuideMax)}`}
            </span>
          </motion.p>
        )}
      </motion.div>

      {/* ─── Divider ─── */}
      <div className="border-t border-gray-200" />

      {/* ─── Commission Rate ─── */}
      <motion.div {...stagger(4)} className="space-y-4">
        <p className="text-gray-500 font-sans text-xs tracking-wider uppercase">
          agency terms
        </p>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="wizard-commission"
              className="block text-sm font-sans font-medium text-gray-700 lowercase"
            >
              commission rate
              <span className="text-gray-400 text-xs ml-2">defaults to agency config</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <span className="text-gray-500 font-sans text-xs group-hover:text-gray-700 transition-colors">
                show on proposal
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={formData.showCommission}
                  onChange={(e) => onChange('showCommission', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-300 rounded-full peer-checked:bg-brand transition-colors duration-200" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-4" />
              </div>
            </label>
          </div>
          <div className="relative max-w-[200px]">
            <input
              type="number"
              id="wizard-commission"
              value={formData.commission}
              onChange={(e) => onChange('commission', e.target.value)}
              step="0.01"
              min="0"
              max="10"
              className="w-full px-4 py-3 pr-10 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans placeholder-gray-400 focus:ring-1 focus:ring-brand focus:border-brand text-base touch-manipulation transition-colors"
              placeholder="1.45"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-sans text-base">
              %
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

interface PropertyRentalStepProps {
  formData: {
    askingRent: string
    leaseType: string
    availableDate: string
    managementFee: string
    lettingFee: string
    heroImage: File | null
    heroImageUrl: string
    propertyAddress: string
  }
  autoImages: string[]
  onChange: (field: string, value: any) => void
}

const LEASE_TYPES = [
  { value: '12-month', label: '12-month fixed', description: 'fixed term lease for 12 months' },
  { value: '6-month', label: '6-month fixed', description: 'fixed term lease for 6 months' },
  { value: 'periodic', label: 'month to month', description: 'ongoing periodic tenancy' },
  { value: '', label: 'n/a', description: 'lease type to be confirmed' },
] as const

const LETTING_FEE_OPTIONS = [
  "1 week's rent + GST",
  "2 weeks' rent + GST",
  "4 weeks' rent + GST",
  'n/a',
]

export function validatePropertyRental(
  data: PropertyRentalStepProps['formData']
): string | null {
  if (!data.askingRent || isNaN(parseInt(data.askingRent))) {
    return 'asking rent is required'
  }
  if (!data.managementFee) {
    return 'management fee is required'
  }
  return null
}

export default function PropertyRentalStep({
  formData,
  autoImages,
  onChange,
}: PropertyRentalStepProps) {
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

  useEffect(() => {
    if (selectedAutoIndex >= autoImages.length && autoImages.length > 0) {
      setSelectedAutoIndex(0)
    }
  }, [autoImages, selectedAutoIndex])

  useEffect(() => {
    return () => {
      if (heroPreview) URL.revokeObjectURL(heroPreview)
    }
  }, [heroPreview])

  const handleFile = useCallback(
    (file: File) => {
      onChange('heroImage', file)
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
      if (file && file.type.startsWith('image/')) handleFile(file)
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

  const displayHeroUrl = useAutoImage && hasAutoImages
    ? autoImages[selectedAutoIndex] || autoImages[0]
    : heroPreview || formData.heroImageUrl || null

  return (
    <div className="space-y-10">
      {/* Step heading */}
      <motion.div {...fadeUp}>
        <h2 className="font-display text-2xl sm:text-3xl text-[#1A1A1A] font-medium lowercase tracking-tight">
          property & rental details
        </h2>
        <p className="text-gray-500 font-sans text-sm mt-2">
          images, rental terms, and management fees
        </p>
      </motion.div>

      {/* ─── Auto-fetched property images ─── */}
      <motion.div {...stagger(0)} className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-gray-500 font-sans text-xs tracking-wider uppercase">
            property images
          </p>
        </div>

        <AnimatePresence mode="wait">
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
                <div className="relative w-full max-h-[220px] overflow-hidden rounded-lg shadow-md">
                  <img
                    src={autoImages[selectedAutoIndex] || autoImages[0]}
                    alt="Property"
                    className="w-full h-full max-h-[220px] object-cover"
                  />
                </div>
                {autoImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {autoImages.slice(0, 8).map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSelectedAutoIndex(i)
                          onChange('selectedAutoImageUrl', autoImages[i])
                        }}
                        className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden shadow-sm transition-all duration-200 border ${
                          i === selectedAutoIndex
                            ? 'ring-2 ring-brand scale-105 border-brand'
                            : 'opacity-60 hover:opacity-100 border-gray-300'
                        }`}
                      >
                        <img src={img} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
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
            {hasAutoImages && useAutoImage ? 'override — leave blank to use auto-fetched' : 'upload or paste URL'}
          </span>
        </label>

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
                <img src={displayHeroUrl} alt="Hero preview" className="w-full h-full max-h-[180px] object-cover" />
              </div>
              <button
                type="button"
                onClick={removeHeroImage}
                className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {(!displayHeroUrl || useAutoImage) && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 min-h-[140px] ${
              isDragging ? 'border-brand bg-brand/10 scale-[1.01]' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
            }`}
          >
            <svg
              className={`w-8 h-8 transition-colors duration-200 ${isDragging ? 'text-brand' : 'text-gray-400'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-gray-500 font-sans text-sm text-center">
              {isDragging ? 'drop image here' : 'drag & drop an image, or click to browse'}
            </p>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileInput} className="sr-only" />
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className="text-gray-500 font-sans text-xs shrink-0">or paste URL</span>
          <input
            type="url"
            value={formData.heroImageUrl}
            onChange={(e) => {
              onChange('heroImageUrl', e.target.value)
              if (e.target.value) { setUseAutoImage(false); setHeroPreview(null) }
            }}
            className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans placeholder-gray-400 focus:ring-1 focus:ring-brand focus:border-brand text-base touch-manipulation transition-colors"
            placeholder="https://..."
          />
        </div>
      </motion.div>

      {/* ─── Divider ─── */}
      <div className="border-t border-gray-200" />

      {/* ─── Rental Terms ─── */}
      <motion.div {...stagger(2)} className="space-y-6">
        <p className="text-gray-500 font-sans text-xs tracking-wider uppercase">
          rental terms
        </p>

        {/* Asking rent */}
        <div>
          <label
            htmlFor="rental-askingRent"
            className="block text-sm font-sans font-medium text-gray-700 mb-2 lowercase"
          >
            asking rent
          </label>
          <div className="relative max-w-[240px]">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-sans text-base">$</span>
            <input
              type="number"
              id="rental-askingRent"
              value={formData.askingRent}
              onChange={(e) => onChange('askingRent', e.target.value)}
              min="0"
              step="10"
              className="w-full pl-8 pr-20 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans placeholder-gray-400 focus:ring-1 focus:ring-brand focus:border-brand text-base touch-manipulation transition-colors"
              placeholder="650"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-sans text-sm">/week</span>
          </div>
          {formData.askingRent && !isNaN(parseInt(formData.askingRent)) && (
            <p className="text-gray-500 font-sans text-sm mt-2">
              ${(parseInt(formData.askingRent) * 52 / 12).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              {' '}<span className="text-gray-400 text-xs">approx. per month</span>
            </p>
          )}
        </div>

        {/* Lease type */}
        <div>
          <label className="block text-sm font-sans font-medium text-gray-700 mb-3 lowercase">
            lease type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {LEASE_TYPES.map((lt) => {
              const isSelected = formData.leaseType === lt.value
              return (
                <motion.button
                  key={lt.value || 'na'}
                  type="button"
                  onClick={() => onChange('leaseType', lt.value)}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 min-h-[48px] ${
                    isSelected
                      ? 'border-brand bg-red-50 shadow-sm shadow-brand/20'
                      : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
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
                  <span className={`block font-sans text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                    {lt.label}
                  </span>
                  <span className={`block font-sans text-xs mt-1 ${isSelected ? 'text-gray-600' : 'text-gray-400'}`}>
                    {lt.description}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Available date */}
        <div>
          <label
            htmlFor="rental-availableDate"
            className="block text-sm font-sans font-medium text-gray-700 mb-2 lowercase"
          >
            available from
            <span className="text-gray-400 text-xs ml-2">optional</span>
          </label>
          <input
            type="date"
            id="rental-availableDate"
            value={formData.availableDate}
            onChange={(e) => onChange('availableDate', e.target.value)}
            className="px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans focus:ring-1 focus:ring-brand focus:border-brand text-base touch-manipulation transition-colors"
          />
        </div>
      </motion.div>

      {/* ─── Divider ─── */}
      <div className="border-t border-gray-200" />

      {/* ─── Management Fees ─── */}
      <motion.div {...stagger(3)} className="space-y-6">
        <p className="text-gray-500 font-sans text-xs tracking-wider uppercase">
          management fees
        </p>

        {/* Management fee */}
        <div>
          <label
            htmlFor="rental-managementFee"
            className="block text-sm font-sans font-medium text-gray-700 mb-2 lowercase"
          >
            management fee
          </label>
          <div className="relative max-w-[200px]">
            <input
              type="number"
              id="rental-managementFee"
              value={formData.managementFee}
              onChange={(e) => onChange('managementFee', e.target.value)}
              step="0.1"
              min="0"
              max="20"
              className="w-full px-4 py-3 pr-10 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans placeholder-gray-400 focus:ring-1 focus:ring-brand focus:border-brand text-base touch-manipulation transition-colors"
              placeholder="8.8"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-sans text-base">%</span>
          </div>
          <p className="text-gray-500 font-sans text-xs mt-1.5">
            of weekly rent collected, + GST
          </p>
        </div>

        {/* Letting fee */}
        <div>
          <label
            htmlFor="rental-lettingFee"
            className="block text-sm font-sans font-medium text-gray-700 mb-2 lowercase"
          >
            letting fee
            <span className="text-gray-400 text-xs ml-2">optional</span>
          </label>
          <select
            id="rental-lettingFee"
            value={formData.lettingFee}
            onChange={(e) => onChange('lettingFee', e.target.value)}
            className="px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans focus:ring-1 focus:ring-brand focus:border-brand text-base touch-manipulation transition-colors min-w-[260px]"
          >
            <option value="">select letting fee...</option>
            {LETTING_FEE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <p className="text-gray-500 font-sans text-xs mt-1.5">
            charged once per new tenancy
          </p>
        </div>
      </motion.div>
    </div>
  )
}

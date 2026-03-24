'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'

interface ReviewGenerateStepProps {
  formData: {
    clientName: string
    clientEmail: string
    propertyAddress: string
    methodOfSale: string
    priceGuideMin: string
    priceGuideMax: string
    heroImage: File | null
    heroImageUrl: string
    commission: string
  }
  marketingCosts: Array<{
    category: string
    description: string
    cost: number
    included: boolean
  }>
  soldComparables: Array<{
    address: string
    price: string
    beds: string
    baths: string
    cars?: string
    date?: string
    included?: boolean
  }>
  onMarketListings: Array<{
    address: string
    price: string
    beds: string
    baths: string
    cars?: string
    included?: boolean
  }>
  autoImages: string[]
  editingId: string | null
  onSubmit: () => Promise<void>
  onGoToStep: (step: number) => void
  isSubmitting: boolean
  result: { id: string; url: string } | null
  error?: string | null
  onNewProposal?: () => void
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function generateEmailText(
  clientName: string,
  propertyAddress: string,
  proposalUrl: string
): string {
  const firstName = clientName.split(' ')[0] || 'there'
  const street =
    propertyAddress.split(',')[0]?.trim() || propertyAddress

  return `Dear ${firstName},

Thank you for the opportunity to present our proposal for the sale of ${street}. It was a pleasure meeting with you, and I truly appreciate the trust you've placed in Grant's Estate Agents.

I've prepared a personalised proposal that outlines our recommended approach, including our marketing strategy, comparable sales data, and the campaign structure designed to achieve the very best result for you.

You can view your proposal here:
${proposalUrl}

The proposal is interactive — you can review each section at your own pace and, when you're ready, express your interest to proceed directly from the page.

If you have any questions at all, please don't hesitate to call me directly. I'm here to guide you through every step of the process.

I look forward to working with you.

Warm regards,

Stuart Grant
Principal — Berwick & Pakenham
Grant's Estate Agents
M: 0438 554 522
E: stuart@grantsea.com.au
W: grantsea.com.au`
}

export default function ReviewGenerateStep({
  formData,
  marketingCosts,
  soldComparables,
  onMarketListings,
  autoImages,
  editingId,
  onSubmit,
  onGoToStep,
  isSubmitting,
  result,
  error,
  onNewProposal,
}: ReviewGenerateStepProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [emailText, setEmailText] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [heroPreview, setHeroPreview] = useState<string | null>(null)

  useEffect(() => {
    setPrefersReducedMotion(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }, [])

  // Generate hero image preview URL from File
  useEffect(() => {
    if (formData.heroImage) {
      const url = URL.createObjectURL(formData.heroImage)
      setHeroPreview(url)
      return () => URL.revokeObjectURL(url)
    } else if (formData.heroImageUrl) {
      setHeroPreview(formData.heroImageUrl)
    } else {
      setHeroPreview(null)
    }
  }, [formData.heroImage, formData.heroImageUrl])

  // Set email text when result arrives
  useEffect(() => {
    if (result) {
      const origin =
        typeof window !== 'undefined' ? window.location.origin : ''
      const proposalUrl = `${origin}${result.url}`
      setEmailText(
        generateEmailText(
          formData.clientName,
          formData.propertyAddress,
          proposalUrl
        )
      )
    }
  }, [result, formData.clientName, formData.propertyAddress])

  const includedMarketing = marketingCosts.filter((i) => i.category)
  const marketingTotal = includedMarketing.reduce(
    (sum, i) => sum + (i.included ? 0 : i.cost),
    0
  )
  const includedSold = soldComparables.filter((c) => c.address && c.included !== false)
  const includedOnMarket = onMarketListings.filter(
    (c) => c.address && c.included !== false
  )

  const priceMin = formData.priceGuideMin
    ? parseInt(formData.priceGuideMin)
    : 0
  const priceMax = formData.priceGuideMax
    ? parseInt(formData.priceGuideMax)
    : 0

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    } catch {}
  }

  const handleSendEmail = async () => {
    if (!result) return
    setSendingEmail(true)
    try {
      const origin =
        typeof window !== 'undefined' ? window.location.origin : ''
      const street =
        formData.propertyAddress.split(',')[0]?.trim() ||
        formData.propertyAddress
      const subject = `Your Property Proposal — ${street}`
      const mailtoUrl = `mailto:${encodeURIComponent(formData.clientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailText)}`
      window.open(mailtoUrl, '_blank')
      setEmailSent(true)
    } catch {
      // Fallback: just open mailto
    } finally {
      setSendingEmail(false)
    }
  }

  const motionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 } as const,
        animate: { opacity: 1, y: 0 } as const,
        transition: { duration: 0.4, ease: 'easeOut' as const },
      }

  const staggerContainer = prefersReducedMotion
    ? {}
    : {
        initial: 'hidden' as const,
        animate: 'show' as const,
        variants: {
          hidden: {},
          show: { transition: { staggerChildren: 0.08 } },
        },
      }

  const staggerItem = prefersReducedMotion
    ? {}
    : {
        variants: {
          hidden: { opacity: 0, y: 12 },
          show: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.35, ease: 'easeOut' as const },
          },
        },
      }

  // --- SUCCESS STATE ---
  if (result) {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : ''
    const fullUrl = `${origin}${result.url}`

    return (
      <div>
        {/* Success checkmark */}
        <div className="flex flex-col items-center text-center mb-10">
          <motion.div
            initial={
              prefersReducedMotion ? false : { scale: 0, opacity: 0 }
            }
            animate={{ scale: 1, opacity: 1 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }
            }
            className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center mb-6"
          >
            <motion.svg
              initial={prefersReducedMotion ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { duration: 0.5, delay: 0.4, ease: 'easeOut' }
              }
              className="w-10 h-10 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <motion.path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
                initial={prefersReducedMotion ? {} : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { duration: 0.5, delay: 0.4, ease: 'easeOut' }
                }
              />
            </motion.svg>
          </motion.div>

          <motion.h2
            {...motionProps}
            transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
            className="font-display text-2xl sm:text-3xl text-gray-900 lowercase mb-2"
          >
            {editingId ? 'proposal updated!' : 'proposal generated!'}
          </motion.h2>
          <motion.p
            {...motionProps}
            transition={{ duration: 0.4, delay: 0.4, ease: 'easeOut' }}
            className="text-gray-500 font-sans text-sm font-light"
          >
            your proposal is ready to share with{' '}
            {formData.clientName.split(' ')[0] || 'the client'}
          </motion.p>
        </div>

        {/* Shareable link */}
        <motion.div
          {...motionProps}
          transition={{ duration: 0.4, delay: 0.5, ease: 'easeOut' }}
          className="mb-6"
        >
          <p className="text-gray-500 font-sans text-xs tracking-wider uppercase mb-2">
            shareable link
          </p>
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3 shadow-sm">
            <span className="text-sm font-mono text-[#C41E2A] truncate">
              {fullUrl}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(fullUrl, 'link')}
              className="shrink-0 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-sans text-xs font-medium transition-colors min-h-[36px]"
            >
              {copied === 'link' ? 'copied!' : 'copy'}
            </button>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          {...motionProps}
          transition={{ duration: 0.4, delay: 0.6, ease: 'easeOut' }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
        >
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-300 font-sans text-sm font-medium transition-all hover:shadow-md min-h-[48px] flex items-center justify-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </svg>
            view
          </a>

          <button
            type="button"
            onClick={handleSendEmail}
            className="px-4 py-3 bg-[#C41E2A] rounded-xl text-white font-sans text-sm font-medium hover:bg-[#a81823] transition-all hover:shadow-lg min-h-[48px] flex items-center justify-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
              />
            </svg>
            send
          </button>

          <a
            href={`${result.url}?print=true`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-300 font-sans text-sm font-medium transition-all hover:shadow-md min-h-[48px] flex items-center justify-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            pdf
          </a>

          <button
            type="button"
            onClick={() => onNewProposal ? onNewProposal() : window.location.reload()}
            className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-300 font-sans text-sm font-medium transition-all hover:shadow-md min-h-[48px] flex items-center justify-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            new
          </button>
        </motion.div>

        {/* Dashboard link */}
        <motion.div
          {...motionProps}
          transition={{ duration: 0.4, delay: 0.65, ease: 'easeOut' }}
          className="mb-8 text-center"
        >
          <Link
            href="/dashboard"
            className="text-gray-400 font-sans text-sm hover:text-gray-600 transition-colors"
          >
            go to dashboard
          </Link>
        </motion.div>

        {/* Email preview / editor */}
        <motion.div
          {...motionProps}
          transition={{ duration: 0.4, delay: 0.7, ease: 'easeOut' }}
          className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-500 font-sans text-xs tracking-wider uppercase mb-1">
                email preview
              </p>
              <p className="text-gray-400 font-sans text-xs font-light">
                to: {formData.clientEmail}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(emailText, 'email')}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-700 font-sans text-xs transition-colors"
            >
              {copied === 'email' ? 'copied!' : 'copy email'}
            </button>
          </div>
          <textarea
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            rows={14}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 font-sans text-sm placeholder-gray-400 focus:ring-2 focus:ring-[#C41E2A] focus:border-transparent resize-y transition-all"
          />
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="px-5 py-3 bg-[#C41E2A] rounded-lg text-white font-sans text-sm font-medium hover:bg-[#a81823] disabled:opacity-50 transition-colors min-h-[44px] flex items-center gap-2"
            >
              {sendingEmail ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  sending...
                </>
              ) : emailSent ? (
                'open email client'
              ) : (
                'send email'
              )}
            </button>
            {emailSent && (
              <span className="text-emerald-600 font-sans text-xs">
                email client opened
              </span>
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  // --- REVIEW STATE (before submission) ---
  return (
    <div>
      {/* Step heading */}
      <motion.div {...motionProps} className="mb-8">
        <h2 className="font-display text-2xl sm:text-3xl font-normal text-gray-900 lowercase">
          review &amp; generate
        </h2>
        <p className="text-gray-500 font-sans text-sm font-light mt-2">
          check everything looks right before generating your proposal
        </p>
      </motion.div>

      {/* Summary cards grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8"
        {...staggerContainer}
      >
        {/* Client Card */}
        <motion.div
          {...staggerItem}
          className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#C41E2A]/10 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-[#C41E2A]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                  />
                </svg>
              </div>
              <p className="text-gray-500 font-sans text-xs tracking-wider uppercase">
                client
              </p>
            </div>
            <button
              type="button"
              onClick={() => onGoToStep(0)}
              className="text-[#C41E2A] font-sans text-xs font-medium hover:text-[#a81823] transition-colors opacity-0 group-hover:opacity-100 min-h-[36px] flex items-center"
            >
              edit
            </button>
          </div>
          <p className="font-display text-lg text-gray-900 lowercase mb-1 line-clamp-1">
            {formData.clientName || '—'}
          </p>
          <p className="text-gray-500 font-sans text-sm font-light mb-1 truncate">
            {formData.clientEmail || '—'}
          </p>
          <p className="text-gray-600 font-sans text-sm font-light line-clamp-2">
            {formData.propertyAddress || '—'}
          </p>
        </motion.div>

        {/* Property & Sale Card */}
        <motion.div
          {...staggerItem}
          className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#8B9F82]/10 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-[#8B9F82]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                  />
                </svg>
              </div>
              <p className="text-gray-500 font-sans text-xs tracking-wider uppercase">
                property &amp; sale
              </p>
            </div>
            <button
              type="button"
              onClick={() => onGoToStep(1)}
              className="text-[#C41E2A] font-sans text-xs font-medium hover:text-[#a81823] transition-colors opacity-0 group-hover:opacity-100 min-h-[36px] flex items-center"
            >
              edit
            </button>
          </div>
          <div className="flex items-center gap-2 mb-3">
            {formData.methodOfSale && (
              <span className="px-2.5 py-1 rounded-md bg-[#C41E2A]/10 text-[#C41E2A] font-sans text-xs font-medium">
                {formData.methodOfSale.toLowerCase()}
              </span>
            )}
            {formData.commission && (
              <span className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 font-sans text-xs">
                {formData.commission}% commission
              </span>
            )}
          </div>
          {priceMin > 0 && priceMax > 0 ? (
            <p className="text-gray-700 font-sans text-sm mb-3">
              {formatCurrency(priceMin)} — {formatCurrency(priceMax)}
            </p>
          ) : (
            <p className="text-gray-400 font-sans text-sm italic mb-3">
              no price guide set
            </p>
          )}
          {heroPreview && (
            <div className="w-full h-20 rounded-lg overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroPreview}
                alt="Hero preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </motion.div>

        {/* Marketing Card */}
        <motion.div
          {...staggerItem}
          className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#8B9F82]/10 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-[#8B9F82]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46"
                  />
                </svg>
              </div>
              <p className="text-gray-500 font-sans text-xs tracking-wider uppercase">
                marketing
              </p>
            </div>
            <button
              type="button"
              onClick={() => onGoToStep(2)}
              className="text-[#C41E2A] font-sans text-xs font-medium hover:text-[#a81823] transition-colors opacity-0 group-hover:opacity-100 min-h-[36px] flex items-center"
            >
              edit
            </button>
          </div>
          {includedMarketing.length > 0 ? (
            <>
              <p className="text-gray-700 font-sans text-sm mb-2">
                {includedMarketing.length} item
                {includedMarketing.length !== 1 ? 's' : ''} &middot;{' '}
                <span className="text-gray-900 font-medium">
                  {formatCurrency(marketingTotal)}
                </span>
              </p>
              <ul className="space-y-1">
                {includedMarketing.slice(0, 3).map((item, i) => (
                  <li
                    key={i}
                    className="text-gray-500 font-sans text-xs font-light flex items-center justify-between"
                  >
                    <span className="truncate mr-2">{item.category}</span>
                    <span className="shrink-0 text-gray-400">
                      {item.included
                        ? 'included'
                        : formatCurrency(item.cost)}
                    </span>
                  </li>
                ))}
              </ul>
              {includedMarketing.length > 3 && (
                <p className="text-gray-400 font-sans text-xs mt-2">
                  +{includedMarketing.length - 3} more
                </p>
              )}
            </>
          ) : (
            <p className="text-gray-400 font-sans text-sm italic">
              using default marketing plan
            </p>
          )}
        </motion.div>

        {/* Comparables Card */}
        <motion.div
          {...staggerItem}
          className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#8B9F82]/10 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-[#8B9F82]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                  />
                </svg>
              </div>
              <p className="text-gray-500 font-sans text-xs tracking-wider uppercase">
                comparables
              </p>
            </div>
            <button
              type="button"
              onClick={() => onGoToStep(3)}
              className="text-[#C41E2A] font-sans text-xs font-medium hover:text-[#a81823] transition-colors opacity-0 group-hover:opacity-100 min-h-[36px] flex items-center"
            >
              edit
            </button>
          </div>
          <p className="text-gray-700 font-sans text-sm mb-2">
            {includedSold.length} sold comparable
            {includedSold.length !== 1 ? 's' : ''}
            {includedOnMarket.length > 0 && (
              <span className="text-gray-500">
                {' '}
                &middot; {includedOnMarket.length} on-market
              </span>
            )}
          </p>
          {includedSold.length > 0 || includedOnMarket.length > 0 ? (
            <ul className="space-y-1">
              {[...includedSold, ...includedOnMarket]
                .slice(0, 3)
                .map((comp, i) => (
                  <li
                    key={i}
                    className="text-gray-500 font-sans text-xs font-light flex items-center justify-between"
                  >
                    <span className="truncate mr-2">
                      {comp.address?.split(',')[0]?.trim() || comp.address}
                    </span>
                    <span className="shrink-0 text-gray-400">
                      {comp.price}
                    </span>
                  </li>
                ))}
              {includedSold.length + includedOnMarket.length > 3 && (
                <li className="text-gray-400 font-sans text-xs mt-1">
                  +{includedSold.length + includedOnMarket.length - 3}{' '}
                  more
                </li>
              )}
            </ul>
          ) : (
            <p className="text-gray-400 font-sans text-sm italic">
              auto-lookup on generate
            </p>
          )}
        </motion.div>
      </motion.div>

      {/* Auto images note */}
      {autoImages.length > 0 && (
        <motion.div
          {...motionProps}
          transition={{ duration: 0.4, delay: 0.35, ease: 'easeOut' }}
          className="mb-6 flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm"
        >
          <svg
            className="w-4 h-4 text-[#8B9F82] shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
            />
          </svg>
          <p className="text-gray-500 font-sans text-xs font-light">
            {autoImages.length} property image
            {autoImages.length !== 1 ? 's' : ''} auto-fetched
          </p>
        </motion.div>
      )}

      {/* Error message */}
      {error && (
        <motion.div
          {...motionProps}
          className="mb-4 bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3"
        >
          <svg
            className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
          <div>
            <p className="text-red-700 font-sans text-sm font-medium mb-1">failed to generate proposal</p>
            <p className="text-red-600 font-sans text-xs font-light">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Generate button */}
      <motion.div
        {...motionProps}
        transition={{ duration: 0.4, delay: 0.4, ease: 'easeOut' }}
      >
        <motion.button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
          className="w-full h-14 bg-[#C41E2A] text-white rounded-xl font-sans text-base font-semibold shadow-lg hover:bg-[#a81823] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
        >
          {isSubmitting ? (
            <>
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              generating proposal...
            </>
          ) : editingId ? (
            'update proposal'
          ) : (
            'generate proposal'
          )}
        </motion.button>
        <p className="text-center text-gray-400 font-sans text-xs mt-3">
          this will create a shareable proposal page for your client
        </p>
      </motion.div>
    </div>
  )
}

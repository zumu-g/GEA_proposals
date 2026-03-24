'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

interface ClientDetailsStepProps {
  formData: {
    clientName: string
    clientEmail: string
    propertyAddress: string
  }
  onChange: (field: string, value: string) => void
  recentProposals: any[]
  editingId: string | null
  onLoadProposal: (proposal: any) => void
  onDeleteProposal: (id: string) => void
  onDuplicateProposal: (proposal: any) => void
}

const DRAFT_KEY = 'gea-wizard-draft'

export function validateClientDetails(
  data: ClientDetailsStepProps['formData']
): string | null {
  if (!data.clientName.trim()) return 'Client name is required'
  if (!data.clientEmail.trim()) return 'Client email is required'
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(data.clientEmail.trim()))
    return 'Please enter a valid email address'
  if (!data.propertyAddress.trim()) return 'Property address is required'
  // Check address has at least 2 words (street + suburb minimum)
  const words = data.propertyAddress.trim().split(/\s+/)
  if (words.length < 2)
    return 'Please enter the full address including suburb'
  return null
}

export default function ClientDetailsStep({
  formData,
  onChange,
  recentProposals,
  editingId,
  onLoadProposal,
  onDeleteProposal,
  onDuplicateProposal,
}: ClientDetailsStepProps) {
  const [hasDraft, setHasDraft] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    setPrefersReducedMotion(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
    try {
      const draft = localStorage.getItem(DRAFT_KEY)
      if (draft) {
        const parsed = JSON.parse(draft)
        // Draft is stored by WizardLayout as { step, formData: {...}, savedAt }
        const fd = parsed.formData || parsed
        if (fd.clientName || fd.clientEmail || fd.propertyAddress) {
          setHasDraft(true)
        }
      }
    } catch {}
  }, [])

  const handleResumeDraft = () => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY)
      if (draft) {
        const parsed = JSON.parse(draft)
        // Draft is stored by WizardLayout as { step, formData: {...}, savedAt }
        const fd = parsed.formData || parsed
        if (fd.clientName) onChange('clientName', fd.clientName)
        if (fd.clientEmail) onChange('clientEmail', fd.clientEmail)
        if (fd.propertyAddress) onChange('propertyAddress', fd.propertyAddress)
        setHasDraft(false)
      }
    } catch {}
  }

  const handleDismissDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
    setHasDraft(false)
  }

  const motionProps = prefersReducedMotion
    ? {}
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, ease: 'easeOut' } }

  const staggerContainer = prefersReducedMotion
    ? {}
    : {
        initial: 'hidden',
        animate: 'show',
        variants: {
          hidden: {},
          show: { transition: { staggerChildren: 0.06 } },
        },
      }

  const staggerItem = prefersReducedMotion
    ? {}
    : {
        variants: {
          hidden: { opacity: 0, y: 10 },
          show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
        },
      }

  const editingProposal = editingId
    ? recentProposals.find((p) => p.id === editingId)
    : null

  // Hide draft banner if the form already has data (WizardLayout auto-restored it)
  const formHasData = !!(formData.clientName || formData.clientEmail || formData.propertyAddress)
  const showDraftBanner = hasDraft && !editingId && !formHasData

  return (
    <div>
      {/* Resume draft banner */}
      <AnimatePresence>
        {showDraftBanner && (
          <motion.div
            key="draft-banner"
            initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="mb-6 bg-[#C41E2A]/10 border border-[#C41E2A]/20 rounded-lg p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-[#C41E2A] flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
              <div>
                <p className="text-[#C41E2A] font-sans text-sm font-medium">
                  you have an unsaved draft
                </p>
                <p className="text-gray-500 font-sans text-xs mt-0.5">
                  pick up where you left off
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResumeDraft}
                className="px-4 py-2 bg-[#C41E2A] rounded-lg text-white font-sans text-xs font-medium hover:bg-[#a81823] transition-colors min-h-[36px]"
              >
                resume draft
              </button>
              <button
                type="button"
                onClick={handleDismissDraft}
                className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 font-sans text-xs transition-colors min-h-[36px]"
              >
                dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editing banner */}
      <AnimatePresence>
        {editingId && editingProposal && (
          <motion.div
            key="editing-banner"
            initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="mb-6 bg-[#C41E2A]/10 border border-[#C41E2A]/20 rounded-lg p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <svg
                className="w-4 h-4 text-[#C41E2A] flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                />
              </svg>
              <div>
                <p className="text-[#C41E2A] font-sans text-sm font-medium">
                  editing: {editingProposal.propertyAddress?.toLowerCase()}
                </p>
                <p className="text-gray-500 font-sans text-xs mt-0.5">
                  changes will update the existing proposal
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step heading — hidden on desktop (WizardLayout shows it), visible on mobile */}
      <motion.div {...motionProps} className="mb-8 lg:hidden">
        <h2 className="font-display text-2xl sm:text-3xl font-normal text-gray-900 lowercase">
          client details
        </h2>
        <p className="text-gray-500 font-sans text-sm font-light mt-2">
          enter the vendor&apos;s information and property address
        </p>
      </motion.div>

      {/* Form fields */}
      <motion.div
        {...motionProps}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
      >
        <div className="mb-6">
          <label
            htmlFor="clientName"
            className="block text-sm font-sans font-medium text-gray-700 mb-1.5 lowercase"
          >
            client name
          </label>
          <input
            type="text"
            id="clientName"
            name="clientName"
            required
            value={formData.clientName}
            onChange={(e) => onChange('clientName', e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 font-sans placeholder-gray-400 focus:ring-2 focus:ring-[#C41E2A] focus:border-[#C41E2A] text-base touch-manipulation transition-all"
            placeholder="John Smith"
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="clientEmail"
            className="block text-sm font-sans font-medium text-gray-700 mb-1.5 lowercase"
          >
            client email
          </label>
          <input
            type="email"
            id="clientEmail"
            name="clientEmail"
            required
            value={formData.clientEmail}
            onChange={(e) => onChange('clientEmail', e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 font-sans placeholder-gray-400 focus:ring-2 focus:ring-[#C41E2A] focus:border-[#C41E2A] text-base touch-manipulation transition-all"
            placeholder="john.smith@example.com"
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="propertyAddress"
            className="block text-sm font-sans font-medium text-gray-700 mb-1.5 lowercase"
          >
            property address
          </label>
          <input
            type="text"
            id="propertyAddress"
            name="propertyAddress"
            required
            value={formData.propertyAddress}
            onChange={(e) => onChange('propertyAddress', e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 font-sans placeholder-gray-400 focus:ring-2 focus:ring-[#C41E2A] focus:border-[#C41E2A] text-base touch-manipulation transition-all"
            placeholder="123 Main Street, Suburb VIC 3000"
          />
          <p className="text-gray-500 font-sans text-xs mt-1.5">
            full address including suburb, state and postcode
          </p>
        </div>
      </motion.div>

      {/* Recent proposals */}
      {recentProposals.length > 0 && (
        <div className="mt-10 pt-8 border-t border-gray-200">
          <p className="text-gray-500 font-sans text-xs tracking-wider uppercase mb-6">
            recent proposals — click edit or duplicate
          </p>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            {...staggerContainer}
          >
            {recentProposals.map((p) => (
              <motion.div
                key={p.id}
                {...staggerItem}
                className="bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 hover:shadow-md transition-all group"
              >
                <p className="font-display text-base font-normal text-gray-900 lowercase mb-1 line-clamp-1">
                  {p.propertyAddress?.toLowerCase()}
                </p>
                <p className="text-gray-500 font-sans text-xs font-light mb-1">
                  {p.clientName}
                </p>
                <div className="flex items-center gap-2 mb-4">
                  {p.methodOfSale && (
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-sans text-xs">
                      {p.methodOfSale.toLowerCase()}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded font-sans text-xs font-medium ${
                      p.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : p.status === 'sent'
                          ? 'bg-blue-100 text-blue-700'
                          : p.status === 'viewed'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {p.status}
                  </span>
                  {p.createdAt && (
                    <span className="text-gray-400 font-sans text-xs ml-auto">
                      {new Date(p.createdAt).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onLoadProposal(p)}
                    className="flex-1 px-3 py-2 bg-[#C41E2A]/10 border border-[#C41E2A]/20 rounded text-[#C41E2A] hover:bg-[#C41E2A]/20 font-sans text-xs font-medium transition-colors min-h-[36px]"
                  >
                    edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicateProposal(p)}
                    className="px-3 py-2 bg-[#8B9F82]/10 border border-[#8B9F82]/20 rounded text-[#8B9F82] hover:bg-[#8B9F82]/20 font-sans text-xs font-medium transition-colors min-h-[36px]"
                  >
                    duplicate
                  </button>
                  <a
                    href={`/proposal/${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-gray-100 border border-gray-200 rounded text-gray-500 hover:text-gray-700 font-sans text-xs font-medium transition-colors min-h-[36px] flex items-center"
                  >
                    view
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          `Delete proposal for ${p.propertyAddress}?`
                        )
                      ) {
                        onDeleteProposal(p.id)
                      }
                    }}
                    className="px-3 py-2 bg-gray-100 border border-gray-200 rounded text-gray-400 hover:text-red-500 hover:border-red-300 font-sans text-xs font-medium transition-colors min-h-[36px] flex items-center"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}
    </div>
  )
}

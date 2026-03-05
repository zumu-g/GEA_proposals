'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Proposal } from '@/types/proposal'

interface ApprovalSectionProps {
  proposal: Proposal
}

export function ApprovalSection({ proposal }: ApprovalSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isApproved, setIsApproved] = useState(proposal.status === 'approved')
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async () => {
    setIsApproving(true)
    setError(null)

    try {
      const response = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: proposal.id }),
      })

      if (!response.ok) throw new Error('Failed to approve proposal')

      setIsApproved(true)
      setIsModalOpen(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsApproving(false)
    }
  }

  if (isApproved) {
    return (
      <section className="bg-forest py-20 sm:py-28 lg:py-36 text-center">
        <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-16 h-16 rounded-full bg-sage/20 flex items-center justify-center mx-auto mb-8">
              <svg className="w-8 h-8 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-white lowercase mb-6">
              proposal approved
            </h2>
            <p className="text-white/50 font-sans text-lg font-light max-w-md mx-auto">
              thank you for choosing {(proposal.agency?.name || 'us').toLowerCase()}. we'll be in touch shortly to begin the journey.
            </p>
          </motion.div>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="bg-charcoal py-20 sm:py-28 lg:py-36 text-center print:py-16">
        <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-12 h-0.5 bg-gold mx-auto mb-12" />
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-white lowercase mb-6">
              ready to begin?
            </h2>
            <p className="text-white/50 font-sans text-lg font-light mb-12 max-w-md mx-auto">
              approve this proposal to start your selling journey with {(proposal.agency?.name || 'us').toLowerCase()}.
            </p>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-12 py-5 bg-gold text-charcoal font-sans font-medium text-lg tracking-wide rounded hover:bg-gold-600 transition-colors min-h-[56px] print:hidden"
            >
              approve proposal
            </motion.button>

            <p className="print:hidden text-white/20 font-sans text-sm mt-8">
              or contact us to discuss any questions
            </p>
          </motion.div>
        </div>
      </section>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[60]"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl z-[70] w-11/12 max-w-md p-6 sm:p-8"
            >
              <div className="gold-accent-line mb-6" />
              <h3 className="font-display text-2xl font-normal text-charcoal lowercase mb-4">
                confirm approval
              </h3>
              <p className="text-charcoal-400 font-sans font-light mb-6 leading-relaxed">
                by approving this proposal, you're confirming you'd like us to proceed with marketing your property. we'll be in touch to arrange next steps.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-600 text-sm font-sans">{error}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={isApproving}
                  className="flex-1 px-6 py-3 border-2 border-charcoal text-charcoal font-sans font-medium rounded hover:bg-charcoal hover:text-white transition-colors min-h-[44px]"
                >
                  cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="flex-1 px-6 py-3 bg-gold text-charcoal font-sans font-medium rounded hover:bg-gold-600 transition-colors disabled:opacity-50 min-h-[44px]"
                >
                  {isApproving ? 'approving...' : 'yes, approve'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

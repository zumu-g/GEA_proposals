'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Proposal } from '@/types/proposal'

interface ApprovalSectionProps {
  proposal: Proposal
}

export function ApprovalSection({ proposal }: ApprovalSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isApproved, setIsApproved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const agentName = proposal.agency?.agentName
  const agentPhone = proposal.agency?.agentPhone
  const agencyName = (proposal.agency?.name || 'us').toLowerCase()

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsApproving(false)
    }
  }

  if (isApproved) {
    return (
      <section className="bg-forest py-20 sm:py-28 lg:py-36 text-center">
        <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-16 h-16 rounded-full bg-sage/20 flex items-center justify-center mx-auto mb-8">
              <svg className="w-8 h-8 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-white lowercase mb-6">
              thank you
            </h2>
            <p className="text-white/70 font-sans text-lg font-light max-w-md mx-auto mb-3">
              your expression of interest has been received. {agentName ? `${agentName} will` : `we'll`} be in touch shortly to discuss next steps.
            </p>
            <p className="text-white/70 font-sans text-sm font-light max-w-md mx-auto">
              this is not a binding agreement — simply an indication that you&rsquo;d like to proceed.
            </p>
            {agentPhone && (
              <a
                href={`tel:${agentPhone}`}
                className="inline-flex items-center gap-2 mt-8 text-sage font-sans text-sm font-medium hover:text-white transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                call {agentName || 'us'} — {agentPhone}
              </a>
            )}
          </motion.div>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="bg-sage-50 py-20 sm:py-28 lg:py-36 text-center print:py-16 relative">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-sage-200 to-transparent" />
        <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {/* Dot cluster treatment — distinct from gold line */}
            <div className="flex items-center justify-center gap-1.5 mb-12">
              <div className="w-1.5 h-1.5 rounded-full bg-sage" />
              <div className="w-1.5 h-1.5 rounded-full bg-gold" />
              <div className="w-1.5 h-1.5 rounded-full bg-sage" />
            </div>

            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-charcoal lowercase mb-6">
              ready to begin?
            </h2>
            <p className="text-charcoal-400 font-sans text-lg font-light mb-12 max-w-md mx-auto">
              express your interest to start the selling journey with {agencyName}.
            </p>

            <motion.button
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-12 py-5 bg-brand text-white font-sans font-medium text-lg tracking-wide rounded-lg hover:bg-brand/90 transition-colors duration-200 min-h-[56px] shadow-md hover:shadow-lg print:hidden"
            >
              proceed with proposal
            </motion.button>

            {/* Secondary CTA — call agent */}
            {agentPhone ? (
              <div className="print:hidden mt-8">
                <p className="text-charcoal-400 font-sans text-sm mb-2">have questions?</p>
                <a
                  href={`tel:${agentPhone}`}
                  className="inline-flex items-center gap-2 text-charcoal font-sans text-sm font-medium hover:text-gold transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  call {agentName ? agentName.toLowerCase() : 'us'} — {agentPhone}
                </a>
              </div>
            ) : (
              <p className="print:hidden text-charcoal-400 font-sans text-sm mt-8">
                or contact us to discuss any questions
              </p>
            )}
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
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-[70] w-11/12 max-w-md p-6 sm:p-8"
            >
              {/* Forest bar treatment for modal */}
              <div className="w-10 h-1 bg-forest rounded-full mb-6" />
              <h3 className="font-display text-2xl font-normal text-charcoal lowercase mb-4">
                confirm your interest
              </h3>
              <p className="text-charcoal-400 font-sans font-light mb-2 leading-relaxed">
                by proceeding, you&rsquo;re expressing your interest in engaging {agencyName} to market your property. this is not a binding contract.
              </p>
              <p className="text-charcoal-400 font-sans text-sm font-light mb-6 leading-relaxed">
                {agentName ? `${agentName} will` : `we'll`} be in touch to discuss the formal agreement and arrange next steps.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm font-sans">{error}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={isApproving}
                  className="flex-1 px-6 py-3 border-2 border-charcoal-100 text-charcoal font-sans font-medium rounded-lg hover:bg-charcoal-50 transition-colors duration-200 min-h-[48px]"
                >
                  cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="flex-1 px-6 py-3 bg-forest text-white font-sans font-medium rounded-lg hover:bg-forest/90 transition-colors duration-200 disabled:opacity-50 min-h-[48px]"
                >
                  {isApproving ? 'submitting...' : 'yes, proceed'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

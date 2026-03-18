'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Proposal } from '@/types/proposal'

interface ApprovalButtonProps {
  proposal: Proposal
  onApprovalChange?: (approved: boolean) => void
}

export function ApprovalButton({ proposal, onApprovalChange }: ApprovalButtonProps) {
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proposalId: proposal.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to approve proposal')
      }

      const result = await response.json()
      setIsApproved(true)
      setIsModalOpen(false)
      onApprovalChange?.(true)

      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsApproving(false)
    }
  }

  if (isApproved) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-sage-50 border-t border-sage-200 z-50 safe-area-inset-bottom">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-4">
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-6 h-6 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sage-800 font-sans font-semibold text-lg">
              proposal approved
            </p>
          </div>
          <p className="text-sage-600 text-sm text-center mt-1 font-sans font-light">
            thank you for your approval. we'll be in touch soon.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Desktop: Floating button */}
      <div className="hidden sm:block fixed bottom-8 right-8 z-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 1 }}
        >
          <Button
            variant="primary"
            size="lg"
            onClick={() => setIsModalOpen(true)}
            className="shadow-2xl"
            aria-label="Approve this proposal"
          >
            approve proposal
          </Button>
        </motion.div>
      </div>

      {/* Mobile: Fixed at bottom */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-charcoal-100 z-50 safe-area-inset-bottom">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <Button
            variant="primary"
            size="lg"
            onClick={() => setIsModalOpen(true)}
            className="w-full"
            aria-label="Approve this proposal"
          >
            approve proposal
          </Button>
        </div>
      </div>

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
                by approving this proposal, you're confirming you'd like us to proceed. we'll be in touch to discuss the next steps.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-600 text-sm font-sans">{error}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1"
                  disabled={isApproving}
                >
                  cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleApprove}
                  isLoading={isApproving}
                  className="flex-1"
                >
                  yes, approve
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

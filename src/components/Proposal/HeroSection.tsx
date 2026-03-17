'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { formatDate } from '@/lib/utils'
import { Proposal } from '@/types/proposal'

interface HeroSectionProps {
  proposal: Proposal
}

export function HeroSection({ proposal }: HeroSectionProps) {
  return (
    <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Property Sale Proposal
          </h1>
          <div className="mt-8 space-y-3 text-lg sm:text-xl">
            <p className="opacity-90">
              <span className="font-semibold">Client:</span> {proposal.clientName}
            </p>
            <p className="opacity-90">
              <span className="font-semibold">Property:</span> {proposal.propertyAddress}
            </p>
            <p className="opacity-75 text-base sm:text-lg mt-4">
              Proposal Date: {formatDate(proposal.proposalDate)}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}


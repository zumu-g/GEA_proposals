'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { formatDate } from '@/lib/utils'
import { Proposal } from '@/types/proposal'

interface HeroSectionProps {
  proposal: Proposal
}

export function HeroSection({ proposal }: HeroSectionProps) {
  const hasHeroImage = !!proposal.heroImage

  return (
    <section className="bg-charcoal text-white relative overflow-hidden">
      {/* Gold accent line at top */}
      <div className="w-full h-1 bg-gold relative z-10" />

      {/* Hero image background */}
      {hasHeroImage && (
        <div className="absolute inset-0 top-1">
          <img
            src={proposal.heroImage}
            alt={proposal.propertyAddress}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-charcoal/75" />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16 sm:py-20 lg:py-28 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-left max-w-3xl"
        >
          {/* Agency name */}
          <p className="text-gold font-sans text-sm tracking-wider-custom uppercase mb-8">
            {proposal.agency?.name || 'property proposal'}
          </p>

          {/* Property address - hero headline */}
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-normal lowercase mb-8 leading-tight">
            {proposal.propertyAddress}
          </h1>

          {/* Gold divider */}
          <div className="gold-accent-line mb-8" />

          {/* Client and date info */}
          <div className="space-y-3">
            <p className="text-white/80 font-sans text-lg sm:text-xl font-light">
              prepared for <span className="text-white font-normal">{proposal.clientName}</span>
            </p>
            <p className="text-white/50 font-sans text-base font-light">
              {formatDate(proposal.proposalDate)}
            </p>
          </div>
        </motion.div>

        {/* Bottom breathing room */}
        <div className="h-12 sm:h-16 lg:h-20" />
      </div>
    </section>
  )
}

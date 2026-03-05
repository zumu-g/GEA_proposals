'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { formatDate } from '@/lib/utils'
import { Proposal } from '@/types/proposal'

interface FullHeroProps {
  proposal: Proposal
}

export function FullHero({ proposal }: FullHeroProps) {
  const hasHeroImage = !!proposal.heroImage

  return (
    <section className="relative h-screen min-h-[600px] max-h-[1200px] bg-charcoal text-white overflow-hidden print:h-auto print:min-h-0 print:max-h-none print:py-20">
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
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/60 to-charcoal/30" />
        </div>
      )}

      {/* Gradient overlay when no image */}
      {!hasHeroImage && (
        <div className="absolute inset-0 top-1">
          <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-charcoal-800 to-forest" />
          {/* Decorative geometric element */}
          <div className="absolute top-1/4 right-0 w-1/3 h-1/2 bg-gold/5 transform skew-x-[-12deg] translate-x-1/4" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-between px-6 sm:px-8 lg:px-16 xl:px-24">
        {/* Top: Agency name */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="pt-8 sm:pt-12"
        >
          <p className="text-gold font-sans text-xs sm:text-sm tracking-[0.25em] uppercase">
            {proposal.agency?.name || 'grant estate agents'}
          </p>
        </motion.div>

        {/* Center: Property address */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
          className="max-w-4xl"
        >
          <div className="gold-accent-line-wide mb-8" />
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-normal lowercase leading-[0.95] mb-8">
            {proposal.propertyAddress}
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
            <p className="text-white/70 font-sans text-lg sm:text-xl font-light">
              prepared for <span className="text-white">{proposal.clientName}</span>
            </p>
            <span className="hidden sm:block w-1 h-1 rounded-full bg-gold" />
            <p className="text-white/40 font-sans text-base font-light">
              {formatDate(proposal.proposalDate)}
            </p>
          </div>
        </motion.div>

        {/* Bottom: Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="pb-8 sm:pb-12 print:hidden"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex items-center gap-3"
          >
            <div className="w-px h-12 bg-gradient-to-b from-transparent to-gold/60" />
            <p className="text-white/30 font-sans text-xs tracking-[0.2em] uppercase">scroll</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

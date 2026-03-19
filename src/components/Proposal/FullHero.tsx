'use client'

import React, { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { formatDate } from '@/lib/utils'
import { Proposal } from '@/types/proposal'

interface FullHeroProps {
  proposal: Proposal
}

export function FullHero({ proposal }: FullHeroProps) {
  const prefersReducedMotion = useReducedMotion()
  const hasHeroImage = !!proposal.heroImage
  const [bounceCount, setBounceCount] = useState(0)

  // Stop bounce after 2 cycles
  useEffect(() => {
    if (prefersReducedMotion) return
    const timer = setTimeout(() => {
      setBounceCount(2)
    }, 4000) // 2 cycles × 2s each
    return () => clearTimeout(timer)
  }, [prefersReducedMotion])

  // Extract street name for watermark (first part before comma)
  const streetName = proposal.propertyAddress.split(',')[0].trim()

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

      {/* Typographic hero when no image provided */}
      {!hasHeroImage && (
        <div className="absolute inset-0 top-1">
          {/* Charcoal-to-forest gradient base */}
          <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-forest/90 to-charcoal" />

          {/* Subtle geometric pattern overlay */}
          <div className="absolute inset-0 opacity-[0.04]">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="hero-grid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                  <path d="M 80 0 L 0 0 0 80" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hero-grid)" />
            </svg>
          </div>

          {/* Diagonal accent line */}
          <div className="absolute top-0 right-0 w-px h-[140%] bg-gradient-to-b from-transparent via-gold/20 to-transparent origin-top-right rotate-[25deg] translate-x-[-30vw]" />

          {/* Large faded address watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
            <p className="font-display text-[12vw] lg:text-[10vw] font-normal lowercase text-white/[0.03] leading-none whitespace-nowrap tracking-tight">
              {streetName}
            </p>
          </div>

          {/* Subtle vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(26,26,26,0.6)_100%)]" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-between px-6 sm:px-8 lg:px-16 xl:px-24">
        {/* Top: Agency logo */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="pt-8 sm:pt-12"
        >
          <img
            src="/images/grants-logo.svg"
            alt={proposal.agency?.name || "Grant's Estate Agents"}
            className="h-12 sm:h-16 w-auto"
          />
        </motion.div>

        {/* Centre: Property address */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' }}
          className="max-w-4xl"
        >
          <div className="w-16 h-px bg-gold mb-8" />
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-normal lowercase leading-[0.95] mb-8 text-balance">
            {proposal.propertyAddress}
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
            <p className="text-white/70 font-sans text-lg sm:text-xl font-light">
              prepared for <span className="text-white">{proposal.clientName}</span>
            </p>
            <span className="hidden sm:block w-1 h-1 rounded-full bg-gold" />
            <p className="text-white/70 font-sans text-base font-light">
              {formatDate(proposal.proposalDate)}
            </p>
          </div>
        </motion.div>

        {/* Bottom: Scroll indicator */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="pb-8 sm:pb-12 print:hidden"
        >
          <motion.div
            animate={
              prefersReducedMotion || bounceCount >= 2
                ? {}
                : { y: [0, 8, 0] }
            }
            transition={{ duration: 2, repeat: bounceCount >= 2 ? 0 : Infinity, ease: 'easeInOut' }}
            className="flex items-center gap-3"
          >
            <div className="w-px h-12 bg-gradient-to-b from-transparent to-gold/60" />
            <p className="text-white/70 font-sans text-xs tracking-[0.2em] uppercase">scroll</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

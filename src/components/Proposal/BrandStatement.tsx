'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Proposal } from '@/types/proposal'
import { formatCurrency } from '@/lib/utils'

interface BrandStatementProps {
  proposal: Proposal
}

export function BrandStatement({ proposal }: BrandStatementProps) {
  const prefersReducedMotion = useReducedMotion()

  // Extract street name (first part before comma)
  const streetName = proposal.propertyAddress.split(',')[0].trim().toLowerCase()

  // Format price guide for Australian dollars
  const formatAUD = (amount: number) =>
    new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)

  return (
    <section className="bg-white py-20 sm:py-28 lg:py-32 relative overflow-hidden">
      {/* Sage accent — vertical bar left side */}
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-sage/0 via-sage to-sage/0" />

      {/* Subtle forest corner accent */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-forest/[0.03] to-transparent" />

      <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
        {/* Personalised brand line */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          <p className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal text-charcoal lowercase leading-snug text-balance mb-12">
            {streetName} deserves more than ordinary.
          </p>
        </motion.div>

        {/* Price guide and method of sale */}
        <div className="flex flex-col sm:flex-row gap-8 sm:gap-16">
          {proposal.priceGuide && (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: 0.08 }}
            >
              <p className="font-sans text-xs tracking-[0.2em] uppercase text-charcoal-400 mb-3">
                price guide
              </p>
              <p className="font-display text-xl sm:text-2xl md:text-3xl font-normal text-forest lowercase">
                {formatAUD(proposal.priceGuide.min)} &ndash; {formatAUD(proposal.priceGuide.max)}
              </p>
            </motion.div>
          )}

          {proposal.methodOfSale && (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: 0.16 }}
            >
              <p className="font-sans text-xs tracking-[0.2em] uppercase text-charcoal-400 mb-3">
                recommended method
              </p>
              <p className="font-display text-xl sm:text-2xl md:text-3xl font-normal text-forest lowercase">
                {proposal.methodOfSale}
              </p>
            </motion.div>
          )}
        </div>

        {/* Sage divider at bottom */}
        {(proposal.priceGuide || proposal.methodOfSale) && (
          <motion.div
            initial={prefersReducedMotion ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="mt-12 h-px bg-sage/30 origin-left"
          />
        )}
      </div>
    </section>
  )
}

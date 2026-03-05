'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Proposal } from '@/types/proposal'

interface IntroductionProps {
  proposal: Proposal
}

export function Introduction({ proposal }: IntroductionProps) {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-off-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Left: Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="gold-accent-line mb-6" />
            <h2 className="font-display text-3xl sm:text-4xl font-normal text-charcoal lowercase">
              your property
            </h2>
          </motion.div>

          {/* Right: Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:pt-4"
          >
            <p className="text-charcoal-500 font-sans text-lg font-light leading-relaxed mb-6">
              thank you for considering {(proposal.agency?.name || 'us').toLowerCase()} for the sale of your property at{' '}
              <span className="text-charcoal font-normal">{proposal.propertyAddress.toLowerCase()}</span>.
            </p>
            <p className="text-charcoal-400 font-sans text-base font-light leading-relaxed mb-6">
              we've prepared this proposal to outline how we'll market your property effectively,
              the process we follow, and comparable properties that have recently sold in your area.
            </p>
            <p className="text-charcoal-400 font-sans text-base font-light leading-relaxed">
              our approach combines local expertise with a modern marketing strategy,
              ensuring your property reaches the right buyers at the right time.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

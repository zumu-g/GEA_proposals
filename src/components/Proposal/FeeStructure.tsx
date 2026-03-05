'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { FeeInfo } from '@/types/proposal'

const DEFAULT_INCLUSIONS = [
  'Professional photography & floor plans',
  'Listings on Rightmove, Zoopla & OnTheMarket',
  'Targeted social media campaigns',
  'Accompanied viewings',
  'Dedicated property negotiator',
  'Sale progression through to completion',
]

interface FeeStructureProps {
  fees?: FeeInfo
}

export function FeeStructure({ fees }: FeeStructureProps) {
  const commissionRate = fees?.commissionRate ?? 1.5
  const fixedFees = fees?.fixedFees ?? []
  const inclusions = fees?.inclusions ?? DEFAULT_INCLUSIONS
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-off-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Left: Headline + Fee */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="gold-accent-line mb-6" />
            <h2 className="font-display text-3xl sm:text-4xl font-normal text-charcoal lowercase mb-8">
              your investment
            </h2>

            <div className="mb-8">
              <p className="text-charcoal-400 font-sans text-sm uppercase tracking-wider-custom mb-2">
                commission
              </p>
              <p className="font-display text-5xl sm:text-6xl font-normal text-gold">
                {commissionRate}%
              </p>
              <p className="text-charcoal-400 font-sans text-base font-light mt-2">
                of the final sale price + VAT
              </p>
            </div>

            {fixedFees.length > 0 && (
              <div>
                <p className="text-charcoal-400 font-sans text-sm uppercase tracking-wider-custom mb-3">
                  additional fees
                </p>
                {fixedFees.map((fee, index) => (
                  <p key={index} className="text-charcoal-500 font-sans text-base font-light mb-1">
                    {fee}
                  </p>
                ))}
              </div>
            )}
          </motion.div>

          {/* Right: Inclusions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:pt-4"
          >
            <p className="text-charcoal-400 font-sans text-sm uppercase tracking-wider-custom mb-6">
              what's included
            </p>
            <div className="space-y-4">
              {inclusions.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex items-start"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-gold mt-2.5 mr-4 flex-shrink-0" />
                  <p className="text-charcoal-500 font-sans text-base font-light leading-relaxed">
                    {item}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

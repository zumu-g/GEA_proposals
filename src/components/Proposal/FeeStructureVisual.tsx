'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { FeeInfo } from '@/types/proposal'

const DEFAULT_INCLUSIONS = [
  'Professional photography & floor plans',
  'Listings on all major portals',
  'Targeted social media campaigns',
  'Accompanied inspections',
  'Dedicated property negotiator',
  'Sale progression through to settlement',
]

const DEFAULT_RENTAL_INCLUSIONS = [
  'Professional photography & floor plans',
  'Listings on all major portals',
  'Targeted social media campaigns',
  'Accompanied inspections',
  'Tenant screening & reference checks',
  'Ongoing property management & rent collection',
]

interface FeeStructureVisualProps {
  fees?: FeeInfo
  showCommission?: boolean
  methodOfSale?: string
  proposalType?: 'sale' | 'rental'
  managementFee?: number
  lettingFee?: string
}

export function FeeStructureVisual({ fees, showCommission = true, methodOfSale, proposalType, managementFee, lettingFee }: FeeStructureVisualProps) {
  const commissionRate = fees?.commissionRate ?? 1.5
  const fixedFees = fees?.fixedFees ?? []
  const prefersReducedMotion = useReducedMotion()
  const isAuction = methodOfSale?.toLowerCase() === 'auction'
  const isRental = proposalType === 'rental'

  const baseInclusions = fees?.inclusions ?? (isRental ? DEFAULT_RENTAL_INCLUSIONS : DEFAULT_INCLUSIONS)
  const inclusions = isAuction && !baseInclusions.some(i => /auction/i.test(i))
    ? [...baseInclusions, 'Licensed auctioneer on auction day']
    : baseInclusions

  return (
    <section className="bg-charcoal py-20 sm:py-28 lg:py-36">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
          {/* Left: Fee highlight — takes 2 cols */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2"
          >
            {/* Thin sage rule treatment — different from gold-accent-line */}
            <div className="w-8 h-px bg-sage mb-6" />
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-white lowercase mb-12 print:mb-5">
              your investment
            </h2>

            {/* Fee display — gold left border accent. Rentals show the
                management fee (% of weekly rent) and letting fee; sales show
                commission (% of final sale price). */}
            {showCommission && (
              <div className="bg-charcoal-700 rounded-lg border-l-4 border-gold p-8 sm:p-10 print:p-5">
                {/* Main fee: displayed inline for tighter spacing */}
                <div className="flex items-baseline gap-2 mb-2">
                  <p className="text-gold font-sans text-xs tracking-[0.25em] uppercase font-semibold">
                    {isRental ? 'management fee' : 'commission'}
                  </p>
                  <p className="font-display text-4xl sm:text-5xl font-normal text-gold leading-none">
                    {isRental ? (managementFee ?? commissionRate) : commissionRate}%
                  </p>
                </div>
                <p className="text-white/70 font-sans text-xs sm:text-sm font-light mb-6">
                  {isRental ? 'of weekly rent collected, + GST' : 'of the final sale price, + GST'}
                </p>

                {/* Secondary fees: compact list format */}
                {isRental && lettingFee && (
                  <div className="space-y-3 py-5 border-t border-white/10">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-white/60 font-sans text-xs tracking-[0.12em] uppercase">
                        letting fee
                      </p>
                      <p className="text-white/80 font-sans text-sm font-light text-right">
                        {lettingFee}
                      </p>
                    </div>
                  </div>
                )}

                {!isRental && fixedFees.length > 0 && (
                  <div className="space-y-3 py-5 border-t border-white/10">
                    {fixedFees.map((fee, index) => (
                      <div key={index} className="flex items-baseline justify-between gap-3">
                        <p className="text-white/60 font-sans text-xs tracking-[0.12em] uppercase">
                          {fee.split(' — ')[0] || 'additional'}
                        </p>
                        <p className="text-white/80 font-sans text-sm font-light text-right">
                          {fee.split(' — ')[1] || fee}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </motion.div>

          {/* Right: Inclusions — takes 3 cols */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: prefersReducedMotion ? 0 : 0.15 }}
            className="lg:col-span-3 lg:pt-20"
          >
            <p className="text-white/60 font-sans text-xs tracking-[0.25em] uppercase mb-8">
              what&rsquo;s included
            </p>
            <div className="space-y-6">
              {inclusions.map((item, index) => (
                <motion.div
                  key={index}
                  initial={prefersReducedMotion ? false : { opacity: 0, x: -15 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: prefersReducedMotion ? 0 : index * 0.06 }}
                  className="flex items-start gap-4 group"
                >
                  <div className="w-8 h-px bg-gold mt-3 flex-shrink-0 group-hover:w-12 transition-all duration-300" />
                  <p className="text-white/80 font-sans text-base sm:text-lg font-light leading-relaxed">
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

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { FeeInfo } from '@/types/proposal'

const DEFAULT_INCLUSIONS = [
  'Professional photography & floor plans',
  'Listings on all major portals',
  'Targeted social media campaigns',
  'Accompanied viewings',
  'Dedicated property negotiator',
  'Sale progression through to completion',
]

interface FeeStructureVisualProps {
  fees?: FeeInfo
}

export function FeeStructureVisual({ fees }: FeeStructureVisualProps) {
  const commissionRate = fees?.commissionRate ?? 1.5
  const fixedFees = fees?.fixedFees ?? []
  const inclusions = fees?.inclusions ?? DEFAULT_INCLUSIONS

  return (
    <section className="bg-off-white py-20 sm:py-28 lg:py-36">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
          {/* Left: Fee highlight - takes 2 cols */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2"
          >
            <div className="gold-accent-line mb-6" />
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-charcoal lowercase mb-12">
              your investment
            </h2>

            {/* Commission display */}
            <div className="bg-charcoal rounded-lg p-8 sm:p-10 text-center">
              <p className="text-gold/60 font-sans text-xs tracking-[0.25em] uppercase mb-4">
                commission
              </p>
              <p className="font-display text-6xl sm:text-7xl lg:text-8xl font-normal text-gold leading-none">
                {commissionRate}%
              </p>
              <p className="text-white/40 font-sans text-sm font-light mt-4">
                of the final sale price + GST
              </p>

              {fixedFees.length > 0 && (
                <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-white/30 font-sans text-xs tracking-[0.15em] uppercase mb-3">
                    additional
                  </p>
                  {fixedFees.map((fee, index) => (
                    <p key={index} className="text-white/50 font-sans text-sm font-light">
                      {fee}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Right: Inclusions - takes 3 cols */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-3 lg:pt-20"
          >
            <p className="text-charcoal-400 font-sans text-xs tracking-[0.25em] uppercase mb-8">
              what's included
            </p>
            <div className="space-y-6">
              {inclusions.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -15 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.06 }}
                  className="flex items-start gap-4 group"
                >
                  <div className="w-8 h-px bg-gold mt-3 flex-shrink-0 group-hover:w-12 transition-all duration-300" />
                  <p className="text-charcoal-500 font-sans text-base sm:text-lg font-light leading-relaxed">
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

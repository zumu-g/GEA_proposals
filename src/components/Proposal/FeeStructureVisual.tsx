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

interface FeeStructureVisualProps {
  fees?: FeeInfo
}

export function FeeStructureVisual({ fees }: FeeStructureVisualProps) {
  const commissionRate = fees?.commissionRate ?? 1.5
  const fixedFees = fees?.fixedFees ?? []
  const inclusions = fees?.inclusions ?? DEFAULT_INCLUSIONS
  const marketingBudget = fees?.marketingBudget
  const prefersReducedMotion = useReducedMotion()

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
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-white lowercase mb-12">
              your investment
            </h2>

            {/* Commission display — gold left border accent */}
            <div className="bg-charcoal-700 rounded-lg border-l-4 border-gold p-8 sm:p-10 text-center">
              <p className="text-gold font-sans text-xs tracking-[0.25em] uppercase mb-4">
                commission
              </p>
              <p className="font-display text-6xl sm:text-7xl lg:text-8xl font-normal text-gold leading-none">
                {commissionRate}%
              </p>
              <p className="text-white/70 font-sans text-sm font-light mt-4">
                of the final sale price + GST
              </p>

              {fixedFees.length > 0 && (
                <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-white/60 font-sans text-xs tracking-[0.15em] uppercase mb-3">
                    additional
                  </p>
                  {fixedFees.map((fee, index) => (
                    <p key={index} className="text-white/70 font-sans text-sm font-light">
                      {fee}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Marketing budget box — shown side by side on larger screens if present */}
            {marketingBudget && (
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: prefersReducedMotion ? 0 : 0.15 }}
                className="bg-charcoal-700 rounded-lg border-l-4 border-sage p-8 sm:p-10 text-center mt-6"
              >
                <p className="text-sage font-sans text-xs tracking-[0.25em] uppercase mb-4">
                  marketing budget
                </p>
                <p className="font-display text-4xl sm:text-5xl font-normal text-white leading-none">
                  {marketingBudget}
                </p>
                <p className="text-white/70 font-sans text-sm font-light mt-4">
                  investment in presenting your property
                </p>
              </motion.div>
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

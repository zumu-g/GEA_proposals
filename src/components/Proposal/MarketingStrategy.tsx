'use client'

import React, { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface MarketingStrategyProps {
  approach?: string
  propertyAddress: string
}

const DEFAULT_APPROACH = `We are currently seeing above average levels of buyer enquiry, and multiple bidders on most homes that come to market. The advertising campaign will target buyers both locally and also out of area buyers currently looking for this specific area. The majority of purchasers in this price bracket will be looking on realestate.com.au and domain.com.au, the campaign will be approved by you prior to launch and the results reviewed with you each week. This provides you with extra prominence in the marketplace and is a cost effective, structured campaign.`

export function MarketingStrategy({ approach, propertyAddress }: MarketingStrategyProps) {
  const prefersReducedMotion = useReducedMotion()
  const [imageError, setImageError] = useState(false)

  const text = approach || DEFAULT_APPROACH

  return (
    <section className="py-20 sm:py-28 lg:py-32 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-lg relative">
              {!imageError ? (
                <img
                  src="/images/stocksy/marketing-strategy.jpg"
                  alt="Marketing strategy"
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-sage-600 to-forest flex items-center justify-center">
                  <svg className="w-20 h-20 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                  </svg>
                </div>
              )}
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: prefersReducedMotion ? 0 : 0.1 }}
          >
            <p className="text-sage font-sans text-xs tracking-[0.3em] uppercase mb-4">
              marketing
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-normal text-charcoal lowercase mb-6">
              our campaign strategy
            </h2>
            <div className="w-12 h-px bg-sage mb-8" />
            <p className="font-sans text-base sm:text-lg font-light text-charcoal-400 leading-relaxed">
              {text}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

'use client'

import React, { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface MethodExplainerProps {
  method?: string
  /** When true, render nothing for unknown methods instead of falling back to
   *  auction copy — used by the development campaign section where residential
   *  auction rationale would be visibly wrong. */
  strict?: boolean
}

const METHOD_CONTENT: Record<string, { rationale: string; benefits: string[] }> = {
  auction: {
    rationale: 'Both Private sale and Auction are ideal for the property, but due to the shortage of homes on the market I am leaning towards an Auction campaign to encourage buyers competing for the property, with a set deadline and a clear strategy to create urgency with buyers. This method will allow us to establish the buyers upper range the probable sale range and is a straight forward approach to the market.',
    benefits: [
      'Creates urgency with a set deadline',
      'Encourages competitive bidding',
      'Establishes the buyers upper range',
      'Transparent and straightforward process',
    ],
  },
  'private sale': {
    rationale: 'A private sale campaign allows us to carefully position your property in the market, giving buyers the time and confidence to put forward their best offer. With a well-structured marketing campaign, we attract serious purchasers while maintaining flexibility on timing and terms that suit you.',
    benefits: [
      'Flexibility on settlement terms',
      'No pressure of auction day',
      'Attracts considered, serious buyers',
      'Ability to negotiate the best outcome',
    ],
  },
  tender: {
    rationale: 'A tender campaign invites buyers to submit their best and final offer in writing by a set deadline. It suits properties with broad appeal to different buyer types — owner-occupiers, investors and developers — where the market is best placed to determine value through sealed, competitive offers.',
    benefits: [
      'Sealed offers encourage buyers to lead with their best price',
      'A set deadline creates urgency',
      'Terms and conditions can be negotiated',
      'Well suited to properties with development potential',
    ],
  },
  'expressions of interest': {
    rationale: 'An Expressions of Interest campaign combines the best elements of both auction and private sale. By setting a closing date for offers, we create urgency while giving buyers the privacy to submit their best terms without the pressure of a public auction.',
    benefits: [
      'Combines urgency with privacy',
      'Buyers submit their best offer',
      'Flexible terms and conditions',
      'Competitive tension without auction pressure',
    ],
  },
}

export function MethodExplainer({ method, strict }: MethodExplainerProps) {
  const prefersReducedMotion = useReducedMotion()
  const [imageError, setImageError] = useState(false)

  if (!method) return null

  const methodLower = method.toLowerCase()
  if (strict && !METHOD_CONTENT[methodLower]) return null
  const content = METHOD_CONTENT[methodLower] || METHOD_CONTENT['auction']

  return (
    <section className="py-20 sm:py-28 lg:py-32 bg-charcoal-900 text-white relative overflow-hidden">
      {/* Subtle texture */}
      <div className="absolute inset-0 bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-charcoal-900" />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-brand font-sans text-xs tracking-[0.3em] uppercase mb-4">
              method of sale
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-normal text-white lowercase mb-6">
              why {methodLower}
            </h2>
            <div className="w-12 h-px bg-brand mb-8" />
            <p className="font-sans text-base sm:text-lg font-light text-white/70 leading-relaxed mb-10">
              {content.rationale}
            </p>

            {/* Benefits */}
            <div className="space-y-4">
              {content.benefits.map((benefit, i) => (
                <motion.div
                  key={i}
                  initial={prefersReducedMotion ? false : { opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: prefersReducedMotion ? 0 : i * 0.07 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <span className="font-sans text-base font-light text-white/80">{benefit}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Image */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: prefersReducedMotion ? 0 : 0.15 }}
          >
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl relative">
              {!imageError ? (
                <img
                  src="/images/stocksy/method-of-sale.jpg"
                  alt="Method of sale"
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-brand/20 to-charcoal-700 flex items-center justify-center">
                  <span className="font-display text-6xl text-white/10">{method.toLowerCase()}</span>
                </div>
              )}
              {/* Method badge */}
              <div className="absolute bottom-4 left-4 bg-brand rounded-lg px-4 py-2">
                <span className="font-sans text-sm font-medium text-white">{method.toLowerCase()}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

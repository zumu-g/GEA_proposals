'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { OFF_MARKET_STAGE } from '@/lib/property-type-content'

interface OffMarketStageProps {
  /** 'full' — charcoal band on the full proposal; 'compact' — light block for Express. */
  variant?: 'full' | 'compact'
}

// "Stage one — testing the market": rendered only when proposal.offMarketCampaign
// is on. Copy is the fixed OFF_MARKET_STAGE constant (one source for both templates).
export function OffMarketStage({ variant = 'full' }: OffMarketStageProps) {
  const prefersReducedMotion = useReducedMotion()
  const fadeUp = {
    initial: prefersReducedMotion ? false : { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.5, ease: 'easeOut' },
  }

  const { eyebrow, title, intro, points, pills, outro } = OFF_MARKET_STAGE

  if (variant === 'compact') {
    return (
      <section className="py-14 sm:py-16 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-6 sm:px-8">
          <motion.p {...fadeUp} className="font-sans text-xs font-medium tracking-wider-custom uppercase text-brand mb-3">
            {eyebrow}
          </motion.p>
          <motion.h2 {...fadeUp} className="font-display text-3xl sm:text-4xl font-normal lowercase text-charcoal-900 mb-4">
            {title}
          </motion.h2>
          <motion.p {...fadeUp} className="font-sans text-base text-gray-600 font-light leading-relaxed mb-5">
            {intro}
          </motion.p>
          <motion.ul {...fadeUp} className="space-y-2 mb-5">
            {[...points, ...pills].map((p) => (
              <li key={p} className="flex items-start gap-3 font-sans text-sm text-gray-700">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </motion.ul>
          <motion.p {...fadeUp} className="font-sans text-sm text-gray-500 leading-relaxed">
            {outro}
          </motion.p>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 sm:py-20 bg-charcoal-900 text-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-brand" />
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
        <motion.p {...fadeUp} className="font-sans text-xs font-medium tracking-wider-custom uppercase text-brand mb-4">
          {eyebrow}
        </motion.p>
        <motion.h2 {...fadeUp} className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal lowercase mb-6">
          {title}
        </motion.h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-7">
            <motion.p {...fadeUp} className="text-white/80 font-sans text-base sm:text-lg font-light leading-relaxed mb-6">
              {intro}
            </motion.p>
            <motion.ul {...fadeUp} className="space-y-3 mb-8">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-3 font-sans text-sm sm:text-base text-white/80">
                  <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </motion.ul>
            <motion.p {...fadeUp} className="text-white/60 font-sans text-sm sm:text-base leading-relaxed max-w-xl">
              {outro}
            </motion.p>
          </div>

          <motion.div {...fadeUp} className="lg:col-span-5 flex flex-wrap lg:flex-col gap-3">
            {pills.map((p) => (
              <div
                key={p}
                className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-5 py-3 font-sans text-sm sm:text-base text-white/90"
              >
                <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0" />
                <span className="lowercase">{p}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

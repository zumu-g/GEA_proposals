'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { SaleStep } from '@/types/proposal'

interface ProcessJourneyProps {
  steps: SaleStep[]
}

export function ProcessJourney({ steps }: ProcessJourneyProps) {
  const prefersReducedMotion = useReducedMotion()

  const fadeUp = prefersReducedMotion
    ? {}
    : { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 } }

  const fadeUpTransition = { duration: 0.4, ease: 'easeOut' }

  // Colour pairings for the large step number blocks — alternates between forest and sage tones
  const stepThemes = [
    { bg: 'from-forest-700 to-forest', text: 'text-forest-200/30' },
    { bg: 'from-sage-600 to-sage-700', text: 'text-sage-200/30' },
    { bg: 'from-forest to-forest-900', text: 'text-forest-300/25' },
    { bg: 'from-sage-700 to-sage-800', text: 'text-sage-300/25' },
    { bg: 'from-forest-800 to-forest-700', text: 'text-forest-200/30' },
    { bg: 'from-sage-600 to-sage-800', text: 'text-sage-200/30' },
  ]

  return (
    <section className="bg-forest-50 py-20 sm:py-28 lg:py-36">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
        {/* Section header — centred label style, no gold accent line */}
        <motion.div
          {...fadeUp}
          viewport={{ once: true }}
          transition={fadeUpTransition}
          className="mb-20 sm:mb-28 text-center"
        >
          <p className="font-sans text-xs font-medium tracking-wider-custom uppercase text-sage-600 mb-4">
            selling process
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-charcoal lowercase mb-5">
            your journey to settlement
          </h2>
          <div className="w-12 h-px bg-sage mx-auto mb-5" />
          <p className="text-charcoal-400 font-sans text-lg font-light max-w-xl mx-auto">
            a proven process, refined over decades, to achieve the best outcome for you
          </p>
        </motion.div>

        {/* Steps — alternating left/right */}
        <div className="space-y-20 sm:space-y-28 lg:space-y-36">
          {steps.map((step, index) => {
            const isEven = index % 2 === 0
            const theme = stepThemes[index % stepThemes.length]
            const stepNumber = String(step.step).padStart(2, '0')

            return (
              <motion.div
                key={step.step}
                {...(prefersReducedMotion
                  ? {}
                  : {
                      initial: { opacity: 0, y: 30 },
                      whileInView: { opacity: 1, y: 0 },
                    })}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={`flex flex-col ${
                  isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'
                } gap-10 lg:gap-16 items-center`}
              >
                {/* Large typographic step number block */}
                <div className="w-full lg:w-1/2">
                  <div
                    className={`aspect-[4/3] rounded-2xl overflow-hidden relative bg-gradient-to-br ${theme.bg} flex items-center justify-center shadow-lg`}
                  >
                    {/* Giant background number */}
                    <span
                      className={`font-display text-[10rem] sm:text-[13rem] lg:text-[15rem] font-normal select-none leading-none ${theme.text}`}
                    >
                      {stepNumber}
                    </span>
                    {/* Foreground number */}
                    <span className="absolute font-display text-7xl sm:text-8xl lg:text-9xl font-normal text-white/90 leading-none">
                      {stepNumber}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="w-full lg:w-1/2">
                  <p className="font-sans text-xs font-medium tracking-wider-custom uppercase text-sage-600 mb-3">
                    step {stepNumber}
                  </p>
                  <h3 className="font-display text-2xl sm:text-3xl font-normal text-charcoal lowercase mb-4">
                    {step.title}
                  </h3>
                  <p className="text-charcoal-400 font-sans text-base sm:text-lg font-light leading-relaxed max-w-md mb-5">
                    {step.description}
                  </p>
                  {step.duration && (
                    <div className="inline-flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm border border-charcoal-100">
                      <svg
                        className="w-4 h-4 text-sage-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-sans text-sm font-medium text-charcoal-500">
                        {step.duration}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

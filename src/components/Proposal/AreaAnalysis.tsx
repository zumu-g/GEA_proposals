'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { formatCurrency } from '@/lib/utils'

interface AreaAnalysisProps {
  analysis?: {
    suburb: string
    medianPrice?: number
    medianDaysOnMarket?: number
    demandLevel?: string
    priceGrowth?: string
    overview: string
    highlights?: string[]
  }
}

export function AreaAnalysis({ analysis }: AreaAnalysisProps) {
  const prefersReducedMotion = useReducedMotion()

  if (!analysis) return null

  const stats = [
    analysis.medianPrice != null && {
      label: 'median price',
      value: formatCurrency(analysis.medianPrice),
    },
    analysis.medianDaysOnMarket != null && {
      label: 'days on market',
      value: String(analysis.medianDaysOnMarket),
    },
    analysis.demandLevel && {
      label: 'buyer demand',
      value: analysis.demandLevel,
      indicator:
        analysis.demandLevel.toLowerCase() === 'high'
          ? 'bg-emerald-400'
          : analysis.demandLevel.toLowerCase() === 'moderate'
            ? 'bg-amber-400'
            : 'bg-charcoal-400',
    },
    analysis.priceGrowth && {
      label: 'price growth',
      value: analysis.priceGrowth,
    },
  ].filter(Boolean) as {
    label: string
    value: string
    indicator?: string
  }[]

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-charcoal">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Section header */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 sm:mb-16"
        >
          <p className="text-warm font-sans text-xs tracking-[0.3em] uppercase mb-3">
            local market
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-normal text-white lowercase">
            the area
          </h2>
        </motion.div>

        {/* Stats grid */}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12 sm:mb-16">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={
                  prefersReducedMotion ? false : { opacity: 0, y: 20 }
                }
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.4,
                  delay: prefersReducedMotion ? 0 : index * 0.07,
                }}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-6 sm:p-8 border border-white/10"
              >
                {stat.indicator && (
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${stat.indicator} mb-3`}
                  />
                )}
                <p className="text-white font-sans text-2xl sm:text-3xl font-semibold mb-2">
                  {stat.value}
                </p>
                <p className="text-white/60 font-sans text-sm tracking-wide">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Overview paragraph */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.5,
            delay: prefersReducedMotion ? 0 : 0.2,
          }}
          className="mb-12 sm:mb-16"
        >
          <p className="text-white/80 font-sans text-lg font-light leading-relaxed max-w-3xl">
            {analysis.overview}
          </p>
        </motion.div>

        {/* Highlights */}
        {analysis.highlights && analysis.highlights.length > 0 && (
          <motion.ul
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.5,
              delay: prefersReducedMotion ? 0 : 0.3,
            }}
            className="space-y-3"
          >
            {analysis.highlights.map((highlight, index) => (
              <motion.li
                key={index}
                initial={
                  prefersReducedMotion ? false : { opacity: 0, x: -10 }
                }
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.3,
                  delay: prefersReducedMotion ? 0 : 0.35 + index * 0.06,
                }}
                className="flex items-start gap-3"
              >
                <svg
                  className="w-5 h-5 text-brand mt-0.5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
                <span className="text-white/80 font-sans text-base font-light">
                  {highlight}
                </span>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>
    </section>
  )
}

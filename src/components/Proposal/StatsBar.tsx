'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface StatsBarProps {
  stats?: Array<{ value: string; label: string }>
}

const defaultStats = [
  { value: '30+', label: 'years experience' },
  { value: '5,000+', label: 'properties sold' },
  { value: '98%', label: 'vendor satisfaction' },
  { value: '14', label: 'average days to sell' },
]

export function StatsBar({ stats }: StatsBarProps) {
  const prefersReducedMotion = useReducedMotion()
  const displayStats = stats && stats.length > 0 ? stats : defaultStats

  return (
    <section className="bg-sage-50 py-16 sm:py-20 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-sage-200 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {displayStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.07 }}
              className="text-center"
            >
              <p className="font-display text-4xl sm:text-5xl lg:text-6xl font-normal text-forest mb-2">
                {stat.value}
              </p>
              <p className="text-charcoal-400 font-sans text-sm tracking-[0.15em] uppercase">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

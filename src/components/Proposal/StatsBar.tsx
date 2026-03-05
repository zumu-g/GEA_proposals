'use client'

import React from 'react'
import { motion } from 'framer-motion'

const stats = [
  { value: '30+', label: 'years experience' },
  { value: '5,000+', label: 'properties sold' },
  { value: '98%', label: 'client satisfaction' },
  { value: '14', label: 'average days to sell' },
]

export function StatsBar() {
  return (
    <section className="bg-forest py-16 sm:py-20 relative overflow-hidden">
      {/* Decorative line */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <p className="font-display text-4xl sm:text-5xl lg:text-6xl font-normal text-gold mb-2">
                {stat.value}
              </p>
              <p className="text-white/50 font-sans text-sm tracking-[0.15em] uppercase">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

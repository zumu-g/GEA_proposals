'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface SectionDividerProps {
  text: string
  variant?: 'dark' | 'forest'
}

export function SectionDivider({ text, variant = 'dark' }: SectionDividerProps) {
  const bg = variant === 'forest' ? 'bg-forest' : 'bg-charcoal'

  return (
    <section className={`${bg} py-16 sm:py-20 lg:py-24`}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-left"
        >
          <div className="gold-accent-line mb-6" />
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-normal text-white lowercase">
            {text}
          </h2>
        </motion.div>
      </div>
    </section>
  )
}

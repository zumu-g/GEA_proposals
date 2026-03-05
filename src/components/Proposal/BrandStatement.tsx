'use client'

import React from 'react'
import { motion } from 'framer-motion'

export function BrandStatement() {
  return (
    <section className="bg-charcoal py-24 sm:py-32 lg:py-40 relative overflow-hidden">
      {/* Subtle decorative elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

      <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="w-12 h-0.5 bg-gold mx-auto mb-12" />
          <blockquote className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal text-white lowercase leading-snug">
            selling your home is personal.
            <br />
            <span className="text-gold">we make it exceptional.</span>
          </blockquote>
          <div className="w-12 h-0.5 bg-gold mx-auto mt-12" />
        </motion.div>
      </div>
    </section>
  )
}

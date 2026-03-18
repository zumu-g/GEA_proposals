'use client'

import React from 'react'
import { motion } from 'framer-motion'

const steps = [
  {
    number: '01',
    title: 'approve this proposal',
    description: 'click the approve button to confirm you\'d like to proceed with us.',
  },
  {
    number: '02',
    title: 'we\'ll be in touch',
    description: 'your dedicated agent will call to arrange a convenient time to visit.',
  },
  {
    number: '03',
    title: 'prepare your property',
    description: 'we\'ll arrange photography, floor plans and prepare your listing.',
  },
]

export function NextSteps() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-forest text-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 sm:mb-16"
        >
          <div className="gold-accent-line mb-6" />
          <h2 className="font-display text-3xl sm:text-4xl font-normal lowercase mb-3">
            the next step
          </h2>
          <p className="text-white/60 font-sans text-lg font-light max-w-xl">
            getting started is simple
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <p className="font-display text-4xl text-gold/40 font-normal mb-4">
                {step.number}
              </p>
              <h3 className="font-display text-xl font-normal lowercase mb-3">
                {step.title}
              </h3>
              <p className="text-white/60 font-sans text-base font-light leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

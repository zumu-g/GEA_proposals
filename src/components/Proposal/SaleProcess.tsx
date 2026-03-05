'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { SaleStep } from '@/types/proposal'

interface SaleProcessProps {
  steps: SaleStep[]
}

export function SaleProcess({ steps }: SaleProcessProps) {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-off-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 sm:mb-16"
        >
          <p className="text-charcoal-400 font-sans text-lg font-light max-w-xl">
            a clear, step-by-step approach to selling your property
          </p>
        </motion.div>

        {/* Mobile: Vertical Timeline */}
        <div className="block sm:hidden">
          <div className="space-y-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="relative pl-12"
              >
                {/* Timeline line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-[15px] top-10 bottom-0 w-px bg-charcoal-100"></div>
                )}

                {/* Step marker - gold dot */}
                <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-gold flex items-center justify-center font-sans text-charcoal font-semibold text-sm z-10">
                  {step.step}
                </div>

                {/* Content */}
                <div className="pb-2">
                  <h3 className="font-display text-xl font-normal text-charcoal lowercase mb-2">
                    {step.title.toLowerCase()}
                  </h3>
                  <p className="text-charcoal-400 font-sans text-base font-light leading-relaxed mb-2">
                    {step.description}
                  </p>
                  {step.duration && (
                    <p className="text-gold-600 font-sans text-sm font-medium">
                      {step.duration}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Desktop: Horizontal Timeline */}
        <div className="hidden sm:block">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute top-4 left-0 right-0 h-px bg-charcoal-100"></div>

            <div className="relative grid grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
              {steps.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="relative pt-12"
                >
                  {/* Gold dot marker */}
                  <div className="absolute top-0 left-0 w-8 h-8 rounded-full bg-gold flex items-center justify-center font-sans text-charcoal font-semibold text-sm z-10">
                    {step.step}
                  </div>

                  {/* Content */}
                  <h3 className="font-display text-xl font-normal text-charcoal lowercase mb-3">
                    {step.title.toLowerCase()}
                  </h3>
                  <p className="text-charcoal-400 font-sans text-base font-light leading-relaxed mb-3">
                    {step.description}
                  </p>
                  {step.duration && (
                    <p className="text-gold-600 font-sans text-sm font-medium">
                      {step.duration}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { SaleStep } from '@/types/proposal'

interface SaleProcessProps {
  steps: SaleStep[]
}

export function SaleProcess({ steps }: SaleProcessProps) {
  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 text-center sm:text-left">
            Our Sale Process
          </h2>
          <p className="text-gray-600 mb-8 sm:mb-12 text-center sm:text-left">
            A clear, step-by-step approach to selling your property
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
                className="relative pl-10"
              >
                {/* Timeline line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-primary-200"></div>
                )}
                
                {/* Step number circle */}
                <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-sm z-10">
                  {step.step}
                </div>

                {/* Content */}
                <div className="bg-gray-50 rounded-lg p-5">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 mb-2">
                    {step.description}
                  </p>
                  {step.duration && (
                    <p className="text-sm text-primary-600 font-medium">
                      ⏱ {step.duration}
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
            <div className="absolute top-8 left-0 right-0 h-0.5 bg-primary-200"></div>
            
            <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="relative"
                >
                  {/* Step number circle */}
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-lg z-10 shadow-lg">
                    {step.step}
                  </div>

                  {/* Content */}
                  <div className="bg-gray-50 rounded-lg p-6 mt-8 h-full">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 mb-3">
                      {step.description}
                    </p>
                    {step.duration && (
                      <p className="text-sm text-primary-600 font-medium">
                        ⏱ {step.duration}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


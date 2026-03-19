'use client'

import React, { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { AgencyConfig } from '@/types/proposal'

interface TeamShowcaseProps {
  agency?: AgencyConfig
}

export function TeamShowcase({ agency }: TeamShowcaseProps) {
  const prefersReducedMotion = useReducedMotion()
  const [imageError, setImageError] = useState(false)

  return (
    <section className="py-20 sm:py-28 lg:py-32 bg-off-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sage font-sans text-xs tracking-[0.3em] uppercase mb-4">
              my team
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-normal text-charcoal lowercase mb-6">
              the biggest team in the area
            </h2>
            <div className="w-12 h-px bg-sage mb-8" />
            <p className="font-sans text-base sm:text-lg font-light text-charcoal-400 leading-relaxed">
              We have a sales team of 8 at our Berwick office, 6 at our Pakenham office and 5 at our Narre Warren office; this is the biggest sales team in the area. The strength of this team means for enquiry, more buyers and allows me to focus on the important facets of your sale process and also allows constant communication with you.
            </p>
          </motion.div>

          {/* Image */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: prefersReducedMotion ? 0 : 0.15 }}
          >
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-lg relative">
              {!imageError ? (
                <img
                  src="/images/stocksy/team.jpg"
                  alt="Our team"
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-forest to-sage flex items-center justify-center">
                  <svg className="w-20 h-20 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                  </svg>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

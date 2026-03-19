'use client'

import React, { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface ClosingStatementProps {
  agentName?: string
  agentTitle?: string
  agentPhoto?: string
}

export function ClosingStatement({ agentName, agentTitle, agentPhoto }: ClosingStatementProps) {
  const prefersReducedMotion = useReducedMotion()
  const [imageError, setImageError] = useState(false)

  const name = agentName || 'Stuart Grant'
  const title = agentTitle || 'Director'
  const photo = '/images/stuart-grant-seated.jpg'
  const hasPhoto = !imageError

  return (
    <section className="py-20 sm:py-28 lg:py-32 bg-off-white relative overflow-hidden">

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Agent photo with quote overlay */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="aspect-[3/4] sm:aspect-[4/5] rounded-2xl overflow-hidden relative shadow-2xl max-w-md mx-auto lg:mx-0">
              {hasPhoto ? (
                <img
                  src={photo}
                  alt={name}
                  className="w-full h-full object-cover object-top"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-charcoal-700 to-charcoal-800 flex items-center justify-center">
                  <svg className="w-24 h-24 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </div>
              )}
              {/* Quote overlay at bottom */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent pt-24 pb-8 px-6">
                <span className="font-display text-4xl text-brand/60 leading-none select-none">&ldquo;</span>
                <p className="font-display text-lg sm:text-xl font-normal text-white/90 lowercase leading-snug mt-1">
                  rest assured I will work harder than any agent you have ever met
                </p>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: prefersReducedMotion ? 0 : 0.15 }}
          >
            <p className="text-brand font-sans text-xs tracking-[0.3em] uppercase mb-6">
              a personal promise
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-normal text-charcoal lowercase mb-8">
              let&apos;s get started
            </h2>
            <div className="w-12 h-px bg-brand mb-8" />

            <p className="font-sans text-base sm:text-lg font-light text-charcoal-400 leading-relaxed mb-10">
              I look forward to getting underway with the campaign. Please call me if you need any further information or have any questions. I am committed to achieving the very best outcome for you and your family.
            </p>

            <div className="border-t border-charcoal-100 pt-8">
              <p className="font-display text-2xl font-normal text-charcoal lowercase">
                {name.toLowerCase()}
              </p>
              <p className="font-sans text-sm font-light text-charcoal-400 mt-1">
                {title} — Grant&apos;s Estate Agents
              </p>
              <img
                src="/images/grants-logo.svg"
                alt="Grant's Estate Agents"
                className="h-10 w-auto mt-6 opacity-60"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

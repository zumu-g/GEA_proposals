'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface InternetPresenceProps {
  listings?: string[]
}

const DEFAULT_LISTINGS = [
  'realestate.com.au (Premiere listing)',
  'domain.com.au',
  'homely.com.au',
  'realestate.com',
  'grantsea.com.au',
]

export function InternetPresence({ listings }: InternetPresenceProps) {
  const prefersReducedMotion = useReducedMotion()
  const platforms = listings && listings.length > 0 ? listings : DEFAULT_LISTINGS

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-start">
          {/* Left — heading */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2"
          >
            <p className="text-sage font-sans text-xs tracking-[0.3em] uppercase mb-4">
              internet
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-normal text-charcoal lowercase mb-4">
              where buyers will find you
            </h2>
            <div className="w-12 h-px bg-sage mb-6" />
            <p className="font-sans text-base font-light text-charcoal-400 leading-relaxed">
              Your property will be prominently displayed on the leading local websites, giving you maximum exposure to active buyers searching in your area.
            </p>
          </motion.div>

          {/* Right — platform list */}
          <div className="lg:col-span-3">
            <div className="space-y-4">
              {platforms.map((platform, index) => {
                const isPremiere = platform.toLowerCase().includes('premiere')
                return (
                  <motion.div
                    key={platform}
                    initial={prefersReducedMotion ? false : { opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: prefersReducedMotion ? 0 : index * 0.06 }}
                    className={`flex items-center gap-4 p-5 rounded-xl border transition-all duration-200 ${
                      isPremiere
                        ? 'bg-brand/5 border-brand/20 shadow-sm'
                        : 'bg-charcoal-50/30 border-charcoal-100/50 hover:border-sage/30'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isPremiere ? 'bg-brand/10' : 'bg-sage/10'
                    }`}>
                      <svg className={`w-5 h-5 ${isPremiere ? 'text-brand' : 'text-sage-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <span className="font-sans text-base font-medium text-charcoal">
                        {platform}
                      </span>
                    </div>
                    {isPremiere && (
                      <span className="px-3 py-1 rounded-full bg-brand/10 text-brand font-sans text-xs font-medium flex-shrink-0">
                        featured
                      </span>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

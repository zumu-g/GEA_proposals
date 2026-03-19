'use client'

import React, { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { OnMarketListing } from '@/types/proposal'

interface OnMarketListingsProps {
  listings: OnMarketListing[]
}

export function OnMarketListings({ listings }: OnMarketListingsProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const prefersReducedMotion = useReducedMotion()

  if (!listings || listings.length === 0) {
    return (
      <section className="py-16 sm:py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sage font-sans text-xs tracking-[0.3em] uppercase mb-3">
              on the market
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-normal text-charcoal lowercase mb-3">
              your competition
            </h2>
            <p className="text-charcoal-400 font-sans text-lg font-light">
              no comparable on-market listings found in your area at this time
            </p>
          </motion.div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-12 sm:mb-16">
            <p className="text-sage font-sans text-xs tracking-[0.3em] uppercase mb-3">
              on the market
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-normal text-charcoal lowercase mb-3">
              your competition
            </h2>
            <p className="text-charcoal-400 font-sans text-lg font-light">
              properties currently listed for sale in your area
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {listings.map((listing, index) => (
            <motion.div
              key={`${listing.address}-${index}`}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: prefersReducedMotion ? 0 : index * 0.07 }}
              className="group"
            >
              <div className="bg-charcoal-50/30 rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 h-full flex flex-col">
                {/* Image */}
                <div className="w-full h-48 overflow-hidden relative">
                  {listing.imageUrl && !imageErrors.has(listing.imageUrl) ? (
                    <img
                      src={listing.imageUrl}
                      alt={listing.address}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={() => {
                        setImageErrors(prev => new Set(prev).add(listing.imageUrl!))
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-sage-50">
                      <svg className="w-14 h-14 text-sage/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
                      </svg>
                    </div>
                  )}
                  {/* Live badge */}
                  <div className="absolute top-3 left-3 bg-green-500 rounded-full px-3 py-1">
                    <span className="text-white font-sans text-xs font-medium">
                      live
                    </span>
                  </div>
                  {listing.propertyType && (
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
                      <span className="text-charcoal font-sans text-xs font-medium">
                        {listing.propertyType.toLowerCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-display text-lg font-normal text-charcoal lowercase mb-2 line-clamp-2">
                    {listing.address.toLowerCase()}
                  </h3>

                  <p className="text-charcoal font-sans text-xl font-semibold mb-4">
                    {listing.askingPrice}
                  </p>

                  <div className="flex flex-wrap gap-3 mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-charcoal-50 text-charcoal font-sans text-xs font-medium">
                      {listing.bedrooms} bed
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-charcoal-50 text-charcoal font-sans text-xs font-medium">
                      {listing.bathrooms} bath
                    </span>
                    {listing.cars > 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-charcoal-50 text-charcoal font-sans text-xs font-medium">
                        {listing.cars} car
                      </span>
                    )}
                  </div>

                  {listing.daysOnMarket !== undefined && (
                    <div className="flex items-center text-sm font-sans mt-auto pt-4">
                      <span className="text-charcoal-400">
                        {listing.daysOnMarket} days on market
                      </span>
                    </div>
                  )}
                </div>

                {listing.url && (
                  <a
                    href={listing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3.5 text-center text-charcoal-400 hover:text-charcoal hover:bg-charcoal-50/50 transition-colors text-sm font-sans font-medium touch-manipulation min-h-[48px] flex items-center justify-center border-t border-charcoal-50/50"
                  >
                    view listing →
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

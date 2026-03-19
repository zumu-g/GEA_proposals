'use client'

import React, { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { PropertySale } from '@/types/proposal'
import { formatCurrency, formatDate } from '@/lib/utils'

interface RecentSalesProps {
  sales: PropertySale[]
}

type SortOption = 'distance' | 'price' | 'date'

export function RecentSales({ sales }: RecentSalesProps) {
  const [sortBy, setSortBy] = useState<SortOption>('distance')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const prefersReducedMotion = useReducedMotion()

  if (!sales || sales.length === 0) {
    return (
      <section className="py-16 sm:py-20 lg:py-24 bg-off-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sage font-sans text-xs tracking-[0.3em] uppercase mb-3">
              comparable sales
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-normal text-charcoal lowercase mb-3">
              recent results nearby
            </h2>
            <p className="text-charcoal-400 font-sans text-lg font-light">
              no comparable sales data available for this area at this time
            </p>
          </motion.div>
        </div>
      </section>
    )
  }

  const sortedSales = [...sales].sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case 'distance':
        comparison = a.distance - b.distance
        break
      case 'price':
        comparison = a.price - b.price
        break
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
        break
    }
    return sortOrder === 'asc' ? comparison : -comparison
  })

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'distance', label: 'distance' },
    { value: 'price', label: 'price' },
    { value: 'date', label: 'date' },
  ]

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-off-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12 sm:mb-16">
            <div>
              {/* Overline label treatment — distinct from gold-accent-line */}
              <p className="text-sage font-sans text-xs tracking-[0.3em] uppercase mb-3">
                comparable sales
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-normal text-charcoal lowercase mb-3">
                recent results nearby
              </h2>
              <p className="text-charcoal-400 font-sans text-lg font-light">
                properties sold in your area to help guide pricing
              </p>
            </div>

            {/* Pill-style sort controls */}
            <div className="flex items-center gap-2 mt-6 sm:mt-0">
              <span className="text-sm font-sans font-medium text-charcoal-400 mr-1">sort</span>
              <div className="flex items-center bg-white rounded-full shadow-sm p-1">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={`px-4 py-2 rounded-full text-sm font-sans font-medium transition-colors duration-200 min-h-[40px] ${
                      sortBy === option.value
                        ? 'bg-charcoal text-white'
                        : 'text-charcoal-400 hover:text-charcoal'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                className="ml-1 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm text-charcoal hover:bg-charcoal-50 font-sans text-sm transition-colors duration-200 focus:ring-2 focus:ring-gold"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {sortedSales.map((sale, index) => (
            <motion.div
              key={`${sale.address}-${index}`}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: prefersReducedMotion ? 0 : index * 0.07 }}
              className="group"
            >
              <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 h-full flex flex-col">
                {/* Image */}
                <div className="w-full h-48 overflow-hidden relative">
                  {sale.imageUrl && !imageErrors.has(sale.imageUrl) ? (
                    <img
                      src={sale.imageUrl}
                      alt={sale.address}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={() => {
                        setImageErrors(prev => new Set(prev).add(sale.imageUrl!))
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-sage-50">
                      <svg className="w-14 h-14 text-sage/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
                      </svg>
                    </div>
                  )}
                  {/* Distance badge */}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
                    <span className="text-charcoal font-sans text-xs font-medium">
                      {(sale.distance ?? 0).toFixed(1)} km
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-display text-lg font-normal text-charcoal lowercase mb-2 line-clamp-2">
                    {sale.address.toLowerCase()}
                  </h3>

                  <p className="text-charcoal font-sans text-2xl font-semibold mb-4">
                    {formatCurrency(sale.price)}
                  </p>

                  <div className="flex flex-wrap gap-3 mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-charcoal-50 text-charcoal font-sans text-xs font-medium">
                      {sale.bedrooms} bed
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-charcoal-50 text-charcoal font-sans text-xs font-medium">
                      {sale.bathrooms} bath
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-charcoal-50 text-charcoal font-sans text-xs font-medium">
                      {(sale.sqft ?? 0).toLocaleString()} sqm
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm font-sans mt-auto pt-4">
                    <span className="text-charcoal-400">
                      {formatDate(sale.date)}
                    </span>
                  </div>
                </div>

                {sale.url && (
                  <a
                    href={sale.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3.5 text-center text-charcoal-400 hover:text-charcoal hover:bg-charcoal-50/50 transition-colors text-sm font-sans font-medium touch-manipulation min-h-[48px] flex items-center justify-center border-t border-charcoal-50/50"
                  >
                    view details →
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

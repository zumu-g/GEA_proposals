'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
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

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-off-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12 sm:mb-16">
            <div>
              <div className="gold-accent-line mb-6" />
              <h2 className="font-display text-3xl sm:text-4xl font-normal text-charcoal lowercase mb-3">
                recent sales
              </h2>
              <p className="text-charcoal-400 font-sans text-lg font-light">
                properties sold in your area to help guide pricing
              </p>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center space-x-3 mt-6 sm:mt-0">
              <label className="text-sm font-sans font-medium text-charcoal-400">sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2 border border-charcoal-100 rounded bg-white text-charcoal font-sans text-sm focus:ring-2 focus:ring-gold focus:border-gold"
              >
                <option value="distance">distance</option>
                <option value="price">price</option>
                <option value="date">date</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                className="px-3 py-2 border border-charcoal-100 rounded bg-white hover:bg-charcoal-50 text-charcoal font-sans text-sm min-h-[44px] focus:ring-2 focus:ring-gold"
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
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="group"
            >
              <div className="bg-white rounded-lg overflow-hidden border border-charcoal-50 hover:border-charcoal-100 transition-all duration-300 hover:shadow-md h-full flex flex-col">
                {/* Image */}
                <div className="w-full h-48 bg-charcoal-50 overflow-hidden relative">
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
                    <div className="w-full h-full flex items-center justify-center bg-charcoal-50">
                      <div className="text-charcoal-200 font-display text-lg lowercase">no image</div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 sm:p-6 flex-1 flex flex-col">
                  <h3 className="font-display text-lg font-normal text-charcoal lowercase mb-2 line-clamp-2">
                    {sale.address.toLowerCase()}
                  </h3>

                  <p className="text-gold-600 font-sans text-xl font-semibold mb-3">
                    {formatCurrency(sale.price)}
                  </p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-charcoal-400 font-sans font-light mb-3">
                    <span>{sale.bedrooms} bed</span>
                    <span>{sale.bathrooms} bath</span>
                    <span>{(sale.sqft ?? 0).toLocaleString()} sq ft</span>
                  </div>

                  <div className="flex items-center justify-between text-sm font-sans mt-auto pt-3 border-t border-charcoal-50">
                    <span className="text-charcoal-300">
                      {formatDate(sale.date)}
                    </span>
                    <span className="text-gold-600 font-medium">
                      {(sale.distance ?? 0).toFixed(1)} mi
                    </span>
                  </div>
                </div>

                {sale.url && (
                  <a
                    href={sale.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-t border-charcoal-50 px-5 py-3 text-center text-charcoal-400 hover:text-gold-600 hover:bg-charcoal-50/50 transition-colors text-sm font-sans font-medium touch-manipulation min-h-[44px] flex items-center justify-center"
                  >
                    view details
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

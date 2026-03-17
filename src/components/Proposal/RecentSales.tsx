'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
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
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
    <section className="py-12 sm:py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-12">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                Recent Sales Nearby
              </h2>
              <p className="text-gray-600">
                Properties sold in your area to help guide pricing
              </p>
            </div>

            {/* Desktop Sort Controls */}
            <div className="hidden sm:flex items-center space-x-4 mt-4 sm:mt-0">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="distance">Distance</option>
                <option value="price">Price</option>
                <option value="date">Date</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-primary-500"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {/* Mobile Sort Controls */}
          <div className="sm:hidden flex items-center space-x-2 mb-6">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="distance">Distance</option>
              <option value="price">Price</option>
              <option value="date">Date</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-base min-h-[44px]"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedSales.map((sale, index) => (
            <motion.div
              key={`${sale.address}-${index}`}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card hover className="h-full flex flex-col">
                <div className="w-full h-48 mb-4 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center relative">
                  {sale.imageUrl && !imageErrors.has(sale.address) ? (
                    <img
                      src={sale.imageUrl}
                      alt={sale.address}
                      className="w-full h-full object-cover"
                      onError={() => {
                        setImageErrors(prev => new Set(prev).add(sale.address))
                      }}
                    />
                  ) : (
                    <span className="text-4xl">🏠</span>
                  )}
                  {/* Distance badge */}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
                    <span className="text-charcoal font-sans text-xs font-medium">
                      {(sale.distance ?? 0).toFixed(1)} km
                    </span>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {sale.address}
                  </h3>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-gray-600 text-sm">
                      <span className="font-semibold text-primary-600 text-lg mr-2">
                        {formatCurrency(sale.price)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                      <span>🛏️ {sale.bedrooms} bed</span>
                      <span>🚿 {sale.bathrooms} bath</span>
                      <span>📐 {sale.sqft.toLocaleString()} sq ft</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        Sold: {formatDate(sale.date)}
                      </span>
                      <span className="text-primary-600 font-semibold">
                        {sale.distance.toFixed(1)} mi away
                      </span>
                    </div>
                  </div>
                </div>

                {sale.url && (
                  <a
                    href={sale.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-4 text-center px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium touch-manipulation min-h-[44px] flex items-center justify-center"
                  >
                    View Details →
                  </a>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

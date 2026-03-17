'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { MarketingItem } from '@/types/proposal'

interface MarketingPlanProps {
  items: MarketingItem[]
}

const channelIcons: Record<string, string> = {
  'Online Listings': '🌐',
  'Social Media': '📱',
  'Print Media': '📰',
  'Email Marketing': '✉️',
  'Open Houses': '🏠',
  'Photography': '📸',
  'Virtual Tours': '🎥',
  'Signage': '📍',
}

export function MarketingPlan({ items }: MarketingPlanProps) {
  // Group items by channel
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.channel]) {
      acc[item.channel] = []
    }
    acc[item.channel].push(item)
    return acc
  }, {} as Record<string, MarketingItem[]>)

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 text-center sm:text-left">
            Marketing Plan
          </h2>
          <p className="text-gray-600 mb-8 sm:mb-12 text-center sm:text-left">
            Comprehensive marketing strategy to maximize exposure
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(groupedItems).map(([channel, channelItems], index) => (
            <motion.div
              key={channel}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card hover className="h-full">
                <div className="flex items-start mb-4">
                  <span className="text-3xl mr-3">
                    {channelIcons[channel] || '📌'}
                  </span>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {channel}
                  </h3>
                </div>
                <div className="space-y-3">
                  {channelItems.map((item, itemIndex) => (
                    <div key={itemIndex} className="border-l-4 border-primary-200 pl-4">
                      <p className="text-gray-700 mb-1">
                        {item.description}
                      </p>
                      {item.cost && (
                        <p className="text-sm text-primary-600 font-medium">
                          {item.cost}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}


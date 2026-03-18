'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { MarketingItem } from '@/types/proposal'

interface MarketingPlanProps {
  items: MarketingItem[]
}

export function MarketingPlan({ items }: MarketingPlanProps) {
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.channel]) {
      acc[item.channel] = []
    }
    acc[item.channel].push(item)
    return acc
  }, {} as Record<string, MarketingItem[]>)

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
            comprehensive marketing to maximise your property's exposure
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {Object.entries(groupedItems).map(([channel, channelItems], index) => (
            <motion.div
              key={channel}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="border-l-2 border-gold pl-6 sm:pl-8"
            >
              <h3 className="font-display text-xl sm:text-2xl font-normal lowercase mb-4 text-charcoal">
                {channel.toLowerCase()}
              </h3>
              <div className="space-y-4">
                {channelItems.map((item, itemIndex) => (
                  <div key={itemIndex}>
                    <p className="text-charcoal-400 font-sans text-base font-light leading-relaxed">
                      {item.description}
                    </p>
                    {item.cost && (
                      <p className="text-gold-600 font-sans text-sm font-medium mt-1">
                        {item.cost}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

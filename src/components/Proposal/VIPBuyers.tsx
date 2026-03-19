'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

export function VIPBuyers() {
  const prefersReducedMotion = useReducedMotion()

  const features = [
    {
      title: 'database access',
      description: 'Our database system provides you with the benefit of accessing hundreds of buyers instantly as soon as your property is listed. This system also allows us to send a hyperlink connection of your property from our website to clients with an e-mail address.',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
        </svg>
      ),
    },
    {
      title: 'vip buyers',
      description: 'Your property will have the benefit of our current buyers who are seeking the right property. These buyers are ready to buy now and will be notified as soon as we commence the campaign.',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
        </svg>
      ),
    },
    {
      title: 'internet presence',
      description: 'Your property will be prominently displayed on the 5 leading local websites, including realestate.com.au and domain.com.au, reaching thousands of active buyers.',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      ),
    },
  ]

  return (
    <section className="py-20 sm:py-28 lg:py-32 bg-forest-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 sm:mb-20"
        >
          <p className="font-sans text-xs font-medium tracking-wider-custom uppercase text-sage-600 mb-4">
            buyer access
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-charcoal lowercase mb-5">
            reaching the right buyers
          </h2>
          <div className="w-12 h-px bg-sage mx-auto mb-5" />
          <p className="text-charcoal-400 font-sans text-lg font-light max-w-xl mx-auto">
            multiple channels working together to ensure maximum exposure for your property
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: prefersReducedMotion ? 0 : index * 0.08 }}
              className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-forest/5 flex items-center justify-center text-forest mb-6">
                {feature.icon}
              </div>
              <h3 className="font-display text-xl font-normal text-charcoal lowercase mb-3">
                {feature.title}
              </h3>
              <p className="font-sans text-base font-light text-charcoal-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

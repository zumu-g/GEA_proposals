'use client'

import React from 'react'
import { motion } from 'framer-motion'

const marketingCapabilities = [
  {
    title: 'professional photography',
    description: 'editorial-quality imagery that captures your home at its finest',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
      </svg>
    ),
    gradient: 'from-charcoal to-charcoal-700',
    span: 'col-span-1 row-span-1',
  },
  {
    title: 'drone & aerial',
    description: 'stunning aerial perspectives that showcase the full scope of your property and surroundings',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
      </svg>
    ),
    gradient: 'from-forest to-forest-700',
    span: 'col-span-1 row-span-1 md:col-span-1 md:row-span-2',
  },
  {
    title: 'social media campaigns',
    description: 'targeted reach across instagram, facebook and beyond',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
    gradient: 'from-charcoal-700 to-charcoal-800',
    span: 'col-span-1 row-span-1',
  },
  {
    title: 'major portal listings',
    description: 'premium placement on realestate.com.au, domain.com.au and all major platforms',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    gradient: 'from-forest-800 to-charcoal',
    span: 'col-span-1 row-span-1 md:col-span-2 md:row-span-1',
  },
  {
    title: 'floor plans & virtual tours',
    description: 'detailed floor plans and immersive 3d walkthroughs',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    gradient: 'from-charcoal-800 to-forest',
    span: 'col-span-1 row-span-1',
  },
  {
    title: 'signboard & print',
    description: 'premium corporate signboard, brochures, and window displays',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
      </svg>
    ),
    gradient: 'from-forest to-charcoal-800',
    span: 'col-span-1 row-span-1',
  },
]

export function MarketingShowcase() {
  return (
    <section className="bg-charcoal py-20 sm:py-28 lg:py-36">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 sm:mb-20"
        >
          <div className="gold-accent-line mb-6" />
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-white lowercase mb-4">
            our marketing
          </h2>
          <p className="text-white/40 font-sans text-lg font-light max-w-lg">
            a comprehensive, multi-channel approach to ensure maximum exposure
          </p>
        </motion.div>

        {/* Marketing grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 auto-rows-[minmax(200px,1fr)]">
          {marketingCapabilities.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className={`${item.span} group relative rounded-lg overflow-hidden bg-gradient-to-br ${item.gradient} p-6 sm:p-8 flex flex-col justify-between border border-white/5 hover:border-gold/20 transition-all duration-500`}
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/5 transition-colors duration-500" />

              {/* Corner accents */}
              <div className="absolute top-3 right-3 w-8 h-8">
                <div className="absolute top-0 right-0 w-full h-px bg-gold/20 group-hover:bg-gold/40 transition-colors" />
                <div className="absolute top-0 right-0 h-full w-px bg-gold/20 group-hover:bg-gold/40 transition-colors" />
              </div>

              <div className="relative z-10">
                <div className="text-gold/50 mb-6 group-hover:text-gold/80 transition-colors duration-500">
                  {item.icon}
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-normal text-white lowercase mb-3">
                  {item.title}
                </h3>
              </div>

              <p className="text-white/40 font-sans text-sm font-light leading-relaxed relative z-10 group-hover:text-white/60 transition-colors duration-500">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

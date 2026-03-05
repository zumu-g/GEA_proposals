'use client'

import React from 'react'
import { motion } from 'framer-motion'

const journeySteps = [
  {
    number: '01',
    title: 'appraisal & strategy',
    description: 'we visit your property, assess the market, and craft a tailored sale strategy designed to achieve the best possible result.',
    visual: 'strategy',
  },
  {
    number: '02',
    title: 'prepare & present',
    description: 'professional photography, styling advice, floor plans, and copywriting — your property presented at its absolute best.',
    visual: 'prepare',
  },
  {
    number: '03',
    title: 'launch & market',
    description: 'a coordinated multi-channel launch across portals, social media, our database, and targeted campaigns to reach qualified buyers.',
    visual: 'launch',
  },
  {
    number: '04',
    title: 'viewings & feedback',
    description: 'accompanied viewings with regular feedback. we qualify every buyer and keep you informed every step of the way.',
    visual: 'viewings',
  },
  {
    number: '05',
    title: 'negotiate & agree',
    description: 'expert negotiation to secure the strongest offer. we work for you to maximise your sale price and terms.',
    visual: 'negotiate',
  },
  {
    number: '06',
    title: 'sold & settled',
    description: 'dedicated sale progression from offer to keys. we manage solicitors, surveys, and every detail through to completion.',
    visual: 'sold',
  },
]

const visualGradients: Record<string, string> = {
  strategy: 'from-gold/20 to-forest/30',
  prepare: 'from-sage/20 to-charcoal/30',
  launch: 'from-forest/20 to-gold/20',
  viewings: 'from-charcoal/20 to-sage/30',
  negotiate: 'from-gold/30 to-charcoal/20',
  sold: 'from-sage/30 to-gold/20',
}

const visualIcons: Record<string, React.ReactNode> = {
  strategy: (
    <svg className="w-12 h-12 text-gold/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008V7.5z" />
    </svg>
  ),
  prepare: (
    <svg className="w-12 h-12 text-gold/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
  ),
  launch: (
    <svg className="w-12 h-12 text-gold/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  ),
  viewings: (
    <svg className="w-12 h-12 text-gold/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  negotiate: (
    <svg className="w-12 h-12 text-gold/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
    </svg>
  ),
  sold: (
    <svg className="w-12 h-12 text-gold/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    </svg>
  ),
}

export function ProcessJourney() {
  return (
    <section className="bg-off-white py-20 sm:py-28 lg:py-36">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 sm:mb-24"
        >
          <div className="gold-accent-line mb-6" />
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-charcoal lowercase mb-4">
            the journey
          </h2>
          <p className="text-charcoal-400 font-sans text-lg font-light max-w-lg">
            a proven process, refined over decades, to achieve the best outcome for you
          </p>
        </motion.div>

        {/* Steps */}
        <div className="space-y-16 sm:space-y-24 lg:space-y-32">
          {journeySteps.map((step, index) => {
            const isEven = index % 2 === 0
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6 }}
                className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 lg:gap-16 items-center`}
              >
                {/* Visual block */}
                <div className="w-full lg:w-1/2">
                  <div className={`aspect-[4/3] rounded-lg bg-gradient-to-br ${visualGradients[step.visual]} relative overflow-hidden`}>
                    {/* Geometric accent */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        {visualIcons[step.visual]}
                        <p className="font-display text-8xl sm:text-9xl font-normal text-charcoal/[0.04] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none">
                          {step.number}
                        </p>
                      </div>
                    </div>
                    {/* Corner accent */}
                    <div className="absolute top-0 left-0 w-16 h-16">
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-gold/30" />
                      <div className="absolute top-0 left-0 h-full w-0.5 bg-gold/30" />
                    </div>
                    <div className="absolute bottom-0 right-0 w-16 h-16">
                      <div className="absolute bottom-0 right-0 w-full h-0.5 bg-gold/30" />
                      <div className="absolute bottom-0 right-0 h-full w-0.5 bg-gold/30" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="w-full lg:w-1/2">
                  <p className="font-display text-6xl sm:text-7xl font-normal text-gold/20 mb-4">
                    {step.number}
                  </p>
                  <h3 className="font-display text-2xl sm:text-3xl font-normal text-charcoal lowercase mb-4">
                    {step.title}
                  </h3>
                  <p className="text-charcoal-400 font-sans text-base sm:text-lg font-light leading-relaxed max-w-md">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface AgentProfileProps {
  agent?: {
    name: string
    title: string
    phone: string
    email?: string
    photoUrl?: string
    bio?: string
    yearsExperience?: number
  }
  databaseInfo?: string
}

export function AgentProfile({ agent, databaseInfo }: AgentProfileProps) {
  const prefersReducedMotion = useReducedMotion()

  if (!agent) return null

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-off-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
          {/* Left column — photo and contact details */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2 flex flex-col items-center lg:items-start"
          >
            {/* Agent photo */}
            <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden border-4 border-brand mb-6 flex-shrink-0">
              {agent.photoUrl ? (
                <img
                  src={agent.photoUrl}
                  alt={agent.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-charcoal-50 flex items-center justify-center">
                  <svg
                    className="w-20 h-20 text-warm"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={0.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Name and title */}
            <h3 className="font-display text-2xl font-normal text-charcoal lowercase text-center lg:text-left">
              {agent.name.toLowerCase()}
            </h3>
            <p className="text-warm font-sans text-base font-light mt-1 text-center lg:text-left">
              {agent.title}
            </p>

            {/* Contact links */}
            <div className="mt-6 space-y-3">
              <a
                href={`tel:${agent.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-3 text-charcoal-400 hover:text-brand transition-colors duration-200 font-sans text-base font-light group"
              >
                <svg
                  className="w-5 h-5 text-warm group-hover:text-brand transition-colors duration-200 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                  />
                </svg>
                {agent.phone}
              </a>

              {agent.email && (
                <a
                  href={`mailto:${agent.email}`}
                  className="flex items-center gap-3 text-charcoal-400 hover:text-brand transition-colors duration-200 font-sans text-base font-light group"
                >
                  <svg
                    className="w-5 h-5 text-warm group-hover:text-brand transition-colors duration-200 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                    />
                  </svg>
                  {agent.email}
                </a>
              )}
            </div>
          </motion.div>

          {/* Right column — bio and details */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: prefersReducedMotion ? 0 : 0.15 }}
            className="lg:col-span-3"
          >
            {/* Overline */}
            <p className="text-warm font-sans text-xs tracking-[0.3em] uppercase mb-4">
              your agent
            </p>

            {/* Bio */}
            {agent.bio && (
              <p className="font-sans text-base sm:text-lg font-light text-charcoal-400 leading-relaxed mb-8">
                {agent.bio}
              </p>
            )}

            {/* Experience stat */}
            {agent.yearsExperience && (
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: prefersReducedMotion ? 0 : 0.25 }}
                className="border-l-2 border-brand pl-6 mb-8"
              >
                <span className="font-display text-4xl sm:text-5xl font-normal text-charcoal">
                  {agent.yearsExperience}+
                </span>
                <p className="text-warm font-sans text-sm font-light mt-1">
                  years of real estate experience
                </p>
              </motion.div>
            )}

          </motion.div>
        </div>
      </div>
    </section>
  )
}

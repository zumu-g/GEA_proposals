'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { AdvertisingWeek } from '@/types/proposal'
import { formatCurrency } from '@/lib/utils'

interface AdvertisingScheduleProps {
  schedule?: AdvertisingWeek[]
  totalCost?: number
}

export function AdvertisingSchedule({ schedule, totalCost }: AdvertisingScheduleProps) {
  const prefersReducedMotion = useReducedMotion()

  if (!schedule || schedule.length === 0) return null

  // Sort so week 0 (extras/campaign prep) comes first, then weeks 1, 2, 3...
  const sorted = [...schedule].sort((a, b) => a.week - b.week)

  const weekTotal = (week: AdvertisingWeek) =>
    week.activities.reduce((sum, a) => sum + (a.included ? 0 : (a.cost ?? 0)), 0)

  const weekLabel = (week: AdvertisingWeek) =>
    week.week === 0 ? 'campaign preparation' : `week ${week.week}`

  const weekBadge = (week: AdvertisingWeek) =>
    week.week === 0 ? 'prep' : String(week.week)

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Section header */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 sm:mb-16"
        >
          <p className="text-warm font-sans text-xs tracking-[0.3em] uppercase mb-3">
            advertising schedule
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-normal text-charcoal lowercase mb-3">
            your campaign
          </h2>
          <p className="text-charcoal-400 font-sans text-lg font-light max-w-2xl">
            a structured {schedule.length}-week marketing campaign to maximise exposure
          </p>
        </motion.div>

        {/* Weekly cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {sorted.map((week, index) => (
            <motion.div
              key={week.week}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.4,
                delay: prefersReducedMotion ? 0 : index * 0.1,
              }}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-charcoal-50/60 overflow-hidden"
            >
              {/* Week header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-50/60">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand text-white font-sans text-sm font-semibold">
                    {weekBadge(week)}
                  </span>
                  <h3 className="font-display text-xl font-normal text-charcoal lowercase">
                    {weekLabel(week)}
                  </h3>
                </div>
                {weekTotal(week) > 0 && (
                  <span className="font-sans text-sm font-semibold text-charcoal">
                    {formatCurrency(weekTotal(week))}
                  </span>
                )}
              </div>

              {/* Activities */}
              <div className="divide-y divide-charcoal-50/40">
                {week.activities.map((activity, actIdx) => (
                  <div
                    key={actIdx}
                    className="flex items-start justify-between gap-4 px-6 py-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-sm font-medium text-charcoal">
                        {activity.category}
                      </p>
                      <p className="font-sans text-sm font-light text-charcoal-400 mt-0.5 leading-relaxed">
                        {activity.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {activity.included ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-sans text-xs font-medium">
                          Included
                        </span>
                      ) : activity.cost != null && activity.cost > 0 ? (
                        <span className="font-sans text-sm font-semibold text-charcoal">
                          {formatCurrency(activity.cost)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Cost summary */}
        {totalCost != null && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.4,
              delay: prefersReducedMotion ? 0 : schedule.length * 0.1,
            }}
            className="mt-12 sm:mt-16"
          >
            <div className="max-w-md ml-auto">
              <div className="h-0.5 bg-brand mb-6" />
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-charcoal-400 font-sans text-sm font-light">
                    total campaign investment
                  </p>
                </div>
                <p className="font-display text-3xl sm:text-4xl font-normal text-charcoal">
                  {formatCurrency(totalCost)}
                </p>
              </div>
              <p className="text-charcoal-400 font-sans text-xs font-light mt-2 text-right">
                all prices inclusive of GST
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}

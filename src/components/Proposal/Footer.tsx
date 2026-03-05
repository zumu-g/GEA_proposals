'use client'

import React from 'react'
import { AgencyConfig } from '@/types/proposal'

interface FooterProps {
  agency?: AgencyConfig
}

export function Footer({ agency }: FooterProps) {
  const name = agency?.name || 'Grant Estate Agents'
  const email = agency?.contactEmail
  const phone = agency?.contactPhone
  const website = agency?.website

  return (
    <footer className="bg-charcoal-900 text-white py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
        {/* Top: Gold line */}
        <div className="w-12 h-0.5 bg-gold mb-12" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {/* Agency */}
          <div>
            <p className="font-display text-2xl text-white lowercase mb-4">
              {name.toLowerCase()}
            </p>
            {agency?.address && (
              <p className="text-white/30 font-sans text-sm font-light">{agency.address}</p>
            )}
          </div>

          {/* Contact */}
          {(email || phone) && (
            <div>
              <p className="text-white/30 font-sans text-xs tracking-[0.2em] uppercase mb-4">contact</p>
              <div className="font-sans text-sm font-light space-y-2">
                {email && (
                  <p>
                    <a href={`mailto:${email}`} className="text-white/50 hover:text-gold transition-colors">
                      {email}
                    </a>
                  </p>
                )}
                {phone && (
                  <p>
                    <a href={`tel:${phone}`} className="text-white/50 hover:text-gold transition-colors">
                      {phone}
                    </a>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Legal */}
          <div className="sm:text-left lg:text-right">
            <p className="text-white/30 font-sans text-xs tracking-[0.2em] uppercase mb-4">notice</p>
            <p className="text-white/20 font-sans text-xs font-light leading-relaxed">
              this proposal is confidential and prepared exclusively for the named recipient.
            </p>
            {website && (
              <p className="text-white/15 font-sans text-xs mt-4">{website}</p>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}

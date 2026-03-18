'use client'

import React from 'react'
import { AgencyConfig } from '@/types/proposal'

interface FooterProps {
  agency?: AgencyConfig
}

export function Footer({ agency }: FooterProps) {
  const name = agency?.name || "Grant's Estate Agents"
  const legalName = (agency as any)?.legalName || name
  const abn = (agency as any)?.abn
  const email = agency?.contactEmail
  const phone = agency?.contactPhone
  const website = agency?.website
  const agentName = agency?.agentName
  const agentTitle = (agency as any)?.agentTitle
  const agentPhone = agency?.agentPhone
  const offices = (agency as any)?.offices as Array<{ name: string; address: string; phone: string }> | undefined

  return (
    <footer className="bg-charcoal-900 text-white py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
        {/* Top: Brand accent line */}
        <div className="w-12 h-0.5 bg-brand mb-12" />

        {/* Agent & Agency Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-12">
          {/* Agency */}
          <div>
            <p className="font-display text-2xl text-white lowercase mb-2">
              {name.toLowerCase()}
            </p>
            {agentName && (
              <p className="text-white/70 font-sans text-sm font-light mb-1">
                {agentName}{agentTitle ? ` — ${agentTitle}` : ''}
              </p>
            )}
            {agentPhone && (
              <p className="text-white/60 font-sans text-sm font-light mb-3">
                <a href={`tel:${agentPhone}`} className="text-white/60 hover:text-brand transition-colors duration-200">
                  {agentPhone}
                </a>
              </p>
            )}
            {abn && (
              <p className="text-white/40 font-sans text-xs font-light">
                ABN {abn}
              </p>
            )}
          </div>

          {/* Contact */}
          {(email || phone) && (
            <div>
              <p className="text-white/60 font-sans text-xs tracking-[0.2em] uppercase mb-4">contact</p>
              <div className="font-sans text-sm font-light space-y-2">
                {email && (
                  <p>
                    <a href={`mailto:${email}`} className="text-white/70 hover:text-brand transition-colors duration-200">
                      {email}
                    </a>
                  </p>
                )}
                {phone && (
                  <p>
                    <a href={`tel:${phone}`} className="text-white/70 hover:text-brand transition-colors duration-200">
                      {phone}
                    </a>
                  </p>
                )}
                {website && (
                  <p className="mt-3">
                    <a
                      href={website.startsWith('http') ? website : `https://${website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/70 hover:text-brand transition-colors duration-200"
                    >
                      {website.replace(/^https?:\/\//, '')}
                    </a>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Legal */}
          <div className="sm:text-left lg:text-right">
            <p className="text-white/60 font-sans text-xs tracking-[0.2em] uppercase mb-4">notice</p>
            <p className="text-white/60 font-sans text-xs font-light leading-relaxed">
              This proposal is confidential and prepared exclusively for the named recipient.
            </p>
            <p className="text-white/40 font-sans text-xs font-light mt-3">
              {legalName}
            </p>
          </div>
        </div>

        {/* Offices row */}
        {offices && offices.length > 0 && (
          <>
            <div className="border-t border-white/10 pt-8">
              <p className="text-white/60 font-sans text-xs tracking-[0.2em] uppercase mb-6">our offices</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {offices.map((office) => (
                  <div key={office.name} className="font-sans">
                    <p className="text-white/80 text-sm font-medium mb-1">{office.name}</p>
                    <p className="text-white/50 text-xs font-light leading-relaxed">{office.address}</p>
                    <p className="text-white/50 text-xs font-light mt-1">
                      <a href={`tel:${office.phone}`} className="hover:text-brand transition-colors duration-200">
                        {office.phone}
                      </a>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </footer>
  )
}

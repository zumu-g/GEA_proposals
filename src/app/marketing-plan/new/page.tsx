'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import MarketingStep from '@/components/Wizard/steps/MarketingStep'
import { AddressAutocomplete } from '@/components/Wizard/steps/ClientDetailsStep'
import { reacomPremiereForSuburb, suburbLabelForPremiere, REACOM_PREMIERE_RATE_VALUES } from '@/lib/marketing-plan'
import type { MarketingCostItem } from '@/lib/marketing-plan'

// Standalone "just a marketing plan" builder — selectable from the first page
// alongside sale / lease. Address + marketing options → one-page printable plan.
// Print-only: nothing is saved to the database.

const DEFAULT_MARKETING_COSTS: MarketingCostItem[] = [
  { category: 'Internet', description: 'Premiere Listing — realestate.com.au (4 week premiere listing — Berwick)', cost: 2760, included: false },
  { category: 'Photography', description: 'Complete Image — Sales Day Shoot (20 images), 2D floor plan, site plan & drone', cost: 550, included: false },
  { category: 'Signboard', description: 'Central signboard — 4 x 8 stock board', cost: 100, included: false },
  { category: 'Internet', description: 'Internet Listings — domain.com and 4 other portals', cost: 0, included: true },
  { category: 'Internet', description: 'Social Media Campaign — Targeted Facebook and Instagram campaign', cost: 0, included: true },
  { category: 'Print', description: 'Brochures — Premium property brochures for open homes', cost: 150, included: false },
  { category: 'Styling', description: 'Digital Staging — virtual furniture', cost: 200, included: false },
  { category: 'Styling', description: 'Home Staging — full property styling & furniture hire', cost: 4500, included: false },
  { category: 'Auctioneer', description: 'Auctioneer — Aleisha (professional auctioneer services)', cost: 700, included: false },
  { category: 'Other', description: 'Open Homes — Weekly open home inspections', cost: 0, included: true },
]

export default function MarketingPlanBuilderPage() {
  const [propertyAddress, setPropertyAddress] = useState('')
  const [marketingCosts, setMarketingCosts] = useState<MarketingCostItem[]>(DEFAULT_MARKETING_COSTS)

  // Auto-adjust the REA premiere listing cost to the property's suburb, unless
  // the user has edited that line (its cost still equals a known rate-card value).
  useEffect(() => {
    const rate = reacomPremiereForSuburb(propertyAddress)
    const label = suburbLabelForPremiere(propertyAddress) || 'Berwick'

    let changed = false
    const next = marketingCosts.map((item) => {
      if (!item.description.startsWith('Premiere Listing — realestate.com.au')) return item
      if (!REACOM_PREMIERE_RATE_VALUES.includes(Number(item.cost))) return item
      const newDescription = item.description.replace(/—\s*[^—)]+\)\s*$/, `— ${label})`)
      if (Number(item.cost) === rate && newDescription === item.description) return item
      changed = true
      return { ...item, cost: rate, description: newDescription }
    })
    if (changed) setMarketingCosts(next)
  }, [propertyAddress, marketingCosts])

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl lowercase text-gray-900">marketing plan</h1>
            <p className="mt-1 font-sans text-sm text-gray-500">
              Build a one-page marketing plan — no proposal required.
            </p>
          </div>
          <Link href="/" className="font-sans text-sm text-gray-400 hover:text-gray-700">
            ← back
          </Link>
        </div>

        {/* Property context (optional) */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
          <AddressAutocomplete value={propertyAddress} onChange={setPropertyAddress} />
        </div>

        {/* Marketing items editor (reused from the wizard). Its built-in
            "preview / print marketing plan" button opens the one-page sheet. */}
        <MarketingStep
          marketingCosts={marketingCosts}
          onChange={setMarketingCosts}
          propertyAddress={propertyAddress}
        />
      </div>
    </div>
  )
}

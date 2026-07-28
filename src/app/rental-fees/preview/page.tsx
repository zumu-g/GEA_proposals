'use client'

import { useEffect, useState } from 'react'
import { rentalFeesTitle, type FeeGroup } from '@/lib/rental-fees'
import { RentalFeeSheet } from '@/components/RentalFees/RentalFeeSheet'
import { RentalFeesPage } from '@/components/RentalFees/RentalFeesPage'

// Key written by the rental-fees builder before opening this preview.
const PREVIEW_STORAGE_KEY = 'gea:rental-fees-preview'

const HERO_SRC = '/images/rental-fees-hero.jpg'

interface PreviewPayload {
  feesProposal: FeeGroup[]
  tribunalCharges: FeeGroup[]
  notes?: string[]
  propertyAddress?: string
}

export default function RentalFeesPreviewPage() {
  const [payload, setPayload] = useState<PreviewPayload | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem(PREVIEW_STORAGE_KEY) || sessionStorage.getItem(PREVIEW_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && Array.isArray(parsed.feesProposal) && Array.isArray(parsed.tribunalCharges)) {
          setPayload(parsed as PreviewPayload)
        }
      }
    } catch {
      // ignore malformed payload
    }
    setLoaded(true)
  }, [])

  if (!loaded) return null

  if (!payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-6 text-center">
        <div>
          <p className="font-display text-2xl lowercase text-[#1A1A1A]">no fee forms to preview</p>
          <p className="mt-2 font-sans text-sm text-gray-500">
            Open this from the rental fee forms builder.
          </p>
        </div>
      </div>
    )
  }

  return (
    <RentalFeesPage documentTitle={rentalFeesTitle(payload.propertyAddress)}>
      <RentalFeeSheet
        heading="Your Fees Proposal"
        groups={payload.feesProposal}
        notes={payload.notes}
        photoSrc={HERO_SRC}
      />
      <RentalFeeSheet
        heading="Statement and Tribunal Charges"
        groups={payload.tribunalCharges}
        photoSrc={HERO_SRC}
      />
    </RentalFeesPage>
  )
}

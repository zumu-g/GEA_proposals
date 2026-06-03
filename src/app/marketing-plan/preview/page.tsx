'use client'

import { useEffect, useState } from 'react'
import type { MarketingCostItem } from '@/lib/marketing-plan'
import { MarketingPlanSheet } from '@/components/Marketing/MarketingPlanSheet'
import { MarketingPlanPage } from '@/components/Marketing/MarketingPlanPage'

// Key written by the wizard Marketing step before opening this preview.
const PREVIEW_STORAGE_KEY = 'gea:marketing-plan-preview'

interface PreviewPayload {
  items: MarketingCostItem[]
  propertyAddress?: string
  priceGuide?: { min?: number; max?: number }
}

export default function MarketingPlanPreviewPage() {
  const [payload, setPayload] = useState<PreviewPayload | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      // Written by the Marketing step via localStorage (shared across tabs).
      // Fall back to sessionStorage for older opens.
      const raw =
        localStorage.getItem(PREVIEW_STORAGE_KEY) ||
        sessionStorage.getItem(PREVIEW_STORAGE_KEY)
      if (raw) setPayload(JSON.parse(raw) as PreviewPayload)
    } catch {
      // ignore malformed payload
    }
    setLoaded(true)
  }, [])

  if (!loaded) return null

  if (!payload || !Array.isArray(payload.items)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-6 text-center">
        <div>
          <p className="font-display text-2xl lowercase text-[#1A1A1A]">no marketing plan to preview</p>
          <p className="mt-2 font-sans text-sm text-gray-500">
            Open this from the Marketing step of the proposal wizard.
          </p>
        </div>
      </div>
    )
  }

  return (
    <MarketingPlanPage>
      <MarketingPlanSheet
        items={payload.items}
        propertyAddress={payload.propertyAddress}
        priceGuide={payload.priceGuide}
      />
    </MarketingPlanPage>
  )
}

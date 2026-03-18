'use client'

import { useEffect } from 'react'

interface ViewTrackerProps {
  proposalId: string
}

export function ViewTracker({ proposalId }: ViewTrackerProps) {
  useEffect(() => {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId }),
    }).catch(() => {
      // Silent fail - tracking is non-critical
    })
  }, [proposalId])

  return null
}

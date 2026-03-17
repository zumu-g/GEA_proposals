'use client'

import React from 'react'

interface ProposalLayoutProps {
  children: React.ReactNode
}

export function ProposalLayout({ children }: ProposalLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full">
        {children}
      </main>
    </div>
  )
}


import React from 'react'

interface ProposalLayoutProps {
  children: React.ReactNode
  /** Print-only running footer (property address + date) — hidden on screen. */
  printFooter?: string
}

export function ProposalLayout({ children, printFooter }: ProposalLayoutProps) {
  return (
    <div className="proposal-print-root min-h-screen bg-off-white">
      <main className="w-full">
        {children}
      </main>
      {printFooter && (
        <div className="proposal-print-footer" aria-hidden="true">
          {printFooter}
        </div>
      )}
    </div>
  )
}

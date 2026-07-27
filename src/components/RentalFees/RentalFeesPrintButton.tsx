'use client'

import { useEffect } from 'react'

// Mirrors MarketingPlanPrintButton — sets document.title (drives the browser's
// default "Save as PDF" filename) then window.print(). Hidden when printing.

export function RentalFeesPrintButton({ title }: { title?: string }) {
  useEffect(() => {
    if (title) document.title = title
  }, [title])

  const handlePrint = () => {
    if (title) document.title = title
    window.print()
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded border border-gray-300 bg-white px-4 py-2.5 font-sans text-sm text-gray-700 shadow-sm transition-all hover:bg-gray-50 print:hidden"
      aria-label="Print rental fee forms"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
        />
      </svg>
      <span>print forms</span>
    </button>
  )
}

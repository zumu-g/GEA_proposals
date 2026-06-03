'use client'

// Light-theme "save pdf" button for the white marketing-plan sheet.
// Mirrors the proposal PdfButton pattern (window.print()) but styled for a
// light background, and hidden when printing.

export function MarketingPlanPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded border border-gray-300 bg-white px-4 py-2.5 font-sans text-sm text-gray-700 shadow-sm transition-all hover:bg-gray-50 print:hidden"
      aria-label="Save marketing plan as PDF"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
        />
      </svg>
      <span>save pdf</span>
    </button>
  )
}

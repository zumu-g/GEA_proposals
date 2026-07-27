// Full-bleed print frame for the rental fee sheets. Unlike MarketingPlanPage
// (14mm margin, white card) these sheets bleed red + photo to every edge, so
// this frame forces zero print margin and color-exact rendering — otherwise
// Chrome prints a white page (browsers strip background colors by default).
// Scoped so it never affects the proposal's global A4-landscape @page rule.

import { ReactNode } from 'react'
import { RentalFeesPrintButton } from './RentalFeesPrintButton'

const PRINT_CSS = `
@media print {
  @page { size: A4 portrait !important; margin: 0 !important; }
  html, body { background: #fff !important; }
  .rf-sheet {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    break-after: page;
  }
  .rf-sheet:last-child { break-after: auto; }
}
`

export function RentalFeesPage({ children, documentTitle }: { children: ReactNode; documentTitle?: string }) {
  return (
    <div className="min-h-screen bg-gray-100 py-10 print:min-h-0 print:bg-white print:py-0">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <RentalFeesPrintButton title={documentTitle} />
      <p className="mx-auto mb-4 max-w-[210mm] px-4 text-center font-sans text-xs text-gray-500 print:hidden">
        In the print dialog, enable &ldquo;Background graphics&rdquo; so the red panel and photo print correctly.
      </p>
      <div className="mx-auto flex w-full flex-col items-center gap-8 print:block print:gap-0">
        {children}
      </div>
    </div>
  )
}

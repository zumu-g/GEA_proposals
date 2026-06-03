// Shared frame for the marketing-plan routes: light page background, the print
// button, and print CSS that forces a single A4 *portrait* page showing only the
// sheet. Scoped so it never affects the full-proposal print styles (which are A4
// landscape in globals.css).

import { ReactNode } from 'react'
import { MarketingPlanPrintButton } from './MarketingPlanPrintButton'

// The marketing-plan routes show ONLY the sheet (plus a fixed print button that
// is hidden when printing), so we print normal-flow on a white A4 portrait page.
// `!important` on size/margin overrides the proposal's global A4-landscape @page.
const PRINT_CSS = `
@media print {
  @page { size: A4 portrait !important; margin: 14mm !important; }
  html, body { background: #fff !important; }
}
`

export function MarketingPlanPage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 print:min-h-0 print:bg-white print:py-0 print:px-0">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <MarketingPlanPrintButton />
      <div className="mkt-plan-sheet mx-auto max-w-[820px] rounded-lg bg-white p-10 shadow-sm print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        {children}
      </div>
    </div>
  )
}

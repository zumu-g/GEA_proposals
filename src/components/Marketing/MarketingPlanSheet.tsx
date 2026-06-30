// ─────────────────────────────────────────────────────────────────────────────
// MarketingPlanSheet — a single-page, print-ready A4 marketing plan.
// Pure presentational component shared by the saved-proposal route and the
// wizard live-preview route. Designed to print to one A4 portrait page via the
// browser's window.print() (no PDF dependency).
// ─────────────────────────────────────────────────────────────────────────────

import { MarketingCostItem, planTotal, formatAUD } from '@/lib/marketing-plan'

export interface MarketingPlanSheetProps {
  items: MarketingCostItem[]
  propertyAddress?: string
  priceGuide?: { min?: number; max?: number }
  agencyName?: string
  agentName?: string
  agentPhone?: string
  agentEmail?: string
}

export function MarketingPlanSheet({
  items,
  propertyAddress,
  priceGuide,
  agencyName = "Grant's Estate Agents",
  agentName = 'Stuart Grant',
  agentPhone = '0438 554 522',
  agentEmail = 'info@grantsea.com.au',
}: MarketingPlanSheetProps) {
  const total = planTotal(items)

  return (
    <div className="mkt-plan-sheet mx-auto w-full max-w-[800px] bg-white text-[#1A1A1A]">
      {/* Header */}
      <header className="flex items-start justify-between border-b-2 border-[#C41E2A] pb-5">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/grants-logo.svg" alt={agencyName} className="h-12 w-auto" />
        </div>
        <div className="text-right">
          <h1 className="font-display text-3xl lowercase leading-none text-[#1A1A1A]">
            marketing plan
          </h1>
          {propertyAddress && (
            <p className="mt-2 font-sans text-sm text-gray-600">{propertyAddress}</p>
          )}
        </div>
      </header>

      {/* Intro line */}
      <p className="mt-6 font-sans text-sm leading-relaxed text-gray-600">
        A tailored advertising campaign designed to maximise exposure and achieve the
        best possible result for your property.
      </p>

      {/* Items table */}
      <table className="mt-5 w-full border-collapse font-sans text-sm">
        <thead>
          <tr className="border-b border-gray-300 text-left">
            <th className="py-2 pr-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Item
            </th>
            <th className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Description
            </th>
            <th className="py-2 pl-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Cost
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={3} className="py-6 text-center text-gray-400">
                No marketing items selected.
              </td>
            </tr>
          )}
          {items.map((item, i) => (
            <tr key={item.id || i} className="border-b border-gray-100 align-top">
              <td className="py-2.5 pr-3 font-medium text-[#1A1A1A]">{item.category}</td>
              <td className="py-2.5 px-3 text-gray-600">{item.description}</td>
              <td className="py-2.5 pl-3 text-right tabular-nums">
                {item.included ? (
                  <span className="text-[#8B9F82]">Included</span>
                ) : (
                  <span className="text-[#1A1A1A]">{formatAUD(item.cost)}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        {items.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-[#1A1A1A]">
              <td colSpan={2} className="py-3 pr-3 font-display text-lg lowercase">
                total campaign investment
              </td>
              <td className="py-3 pl-3 text-right font-sans text-lg font-bold tabular-nums text-[#C41E2A]">
                {formatAUD(total)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>

      {/* Footer — agent contact */}
      <footer className="mt-8 border-t border-gray-200 pt-4 font-sans text-xs text-gray-500">
        <p className="font-medium text-[#1A1A1A]">{agentName} · {agencyName}</p>
        <p className="mt-0.5">
          {agentPhone} · {agentEmail}
        </p>
      </footer>
    </div>
  )
}

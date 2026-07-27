// ─────────────────────────────────────────────────────────────────────────────
// RentalFeeSheet — a single A4-portrait (210mm x 297mm) fee sheet, full bleed.
// Renders either of the two source forms: pass one untitled group for "Your
// Fees Proposal", or two titled groups for "Statement and Tribunal Charges".
// Fixed-mm geometry (not viewport units) so screen preview and print output
// share the same layout — see RentalFeesPage for the scale-to-fit wrapper.
// ─────────────────────────────────────────────────────────────────────────────

import { FeeGroup } from '@/lib/rental-fees'

export interface RentalFeeSheetProps {
  heading: string
  groups: FeeGroup[]
  notes?: string[]
  photoSrc?: string
}

export function RentalFeeSheet({ heading, groups, notes, photoSrc }: RentalFeeSheetProps) {
  return (
    <div className="rf-sheet relative h-[297mm] w-[210mm] overflow-hidden bg-[#C41E2A] text-white">
      {photoSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoSrc}
          alt=""
          className="absolute inset-y-0 right-0 left-[55%] h-full w-auto object-cover"
          style={{ objectPosition: '72% center' }}
        />
      )}

      <h1 className="absolute top-[80mm] left-[34mm] w-[75mm] font-sans text-[24pt] leading-[1.35] font-medium tracking-[0.18em] uppercase">
        {heading}
      </h1>

      <div className="absolute top-[112mm] left-[34mm] w-[78mm] space-y-4">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.title && (
              <p className="mb-1.5 font-sans text-[11pt] font-semibold">{group.title}</p>
            )}
            <div className="space-y-1">
              {group.rows.map((row, ri) => (
                <div key={ri}>
                  <div className="flex items-baseline justify-between gap-3 font-sans text-[10.5pt] leading-[1.55]">
                    <span>{row.label}</span>
                    <span className="whitespace-nowrap">{row.value}</span>
                  </div>
                  {row.note && (
                    <p className="font-sans text-[9pt] leading-[1.4] opacity-90">{row.note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {notes && notes.length > 0 && (
          <div className="space-y-0.5 pt-2">
            {notes.map((note, ni) => (
              <p key={ni} className="font-sans text-[8.5pt] leading-[1.4] font-semibold">
                {note}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/grants-logo.svg"
        alt="Grant's"
        className="absolute bottom-[40mm] left-[30mm] w-[52mm]"
      />
    </div>
  )
}

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

      {/*
        Heading, groups, and notes stack in normal flow inside one column so a
        taller heading (this form's 3-line "STATEMENT AND / TRIBUNAL / CHARGES"
        vs. the other form's 2-line heading) pushes the rows down instead of
        overlapping them — two independently absolutely-positioned blocks with
        hardcoded `top` offsets was the bug: it only "worked" for the shorter
        heading. Measured off the source scan: the red panel ends at 55% width
        (115.5mm), so this column (left 34mm, width 82mm) stays clear of the
        photo with margin. The heading itself is narrower (64mm) so it wraps
        at the same points as the artwork. Each fee row is a fixed-width label
        column + a value that starts at a left tab-stop right after it — the
        source does NOT right-justify values to the panel edge, which is what
        the previous `justify-between` layout did (and why long labels wrapped
        and overran the logo below).
      */}
      <div className="absolute top-[70mm] left-[34mm] w-[82mm]">
        <h1 className="w-[64mm] font-sans text-[16pt] leading-[1.3] font-medium tracking-[0.12em] uppercase">
          {heading}
        </h1>

        <div className="mt-[19mm] space-y-3.5">
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.title && (
                <p className="mb-1.5 font-sans text-[10.5pt] font-semibold">{group.title}</p>
              )}
              <div className="space-y-1">
                {group.rows.map((row, ri) => (
                  <div key={ri}>
                    <div className="grid grid-cols-[54mm_1fr] items-baseline gap-x-2 font-sans text-[9pt] leading-[1.45]">
                      <span>{row.label}</span>
                      <span>{row.value}</span>
                    </div>
                    {row.note && (
                      <p className="font-sans text-[8pt] leading-[1.35] whitespace-normal opacity-90">
                        {row.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {notes && notes.length > 0 && (
            <div className="space-y-0.5 pt-2">
              {notes.map((note, ni) => (
                <p key={ni} className="font-sans text-[7.5pt] leading-[1.35] font-semibold">
                  {note}
                </p>
              ))}
            </div>
          )}
        </div>
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

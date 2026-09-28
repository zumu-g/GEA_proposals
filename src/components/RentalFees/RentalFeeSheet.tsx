// ─────────────────────────────────────────────────────────────────────────────
// RentalFeeSheet — a single A4-portrait (210mm x 297mm) fee sheet, full bleed.
// Renders either of the two source forms: pass one untitled group for "Your
// Fees Proposal", or two titled groups for "Statement and Tribunal Charges".
// Fixed-mm geometry (not viewport units) so screen preview and print output
// share the same layout — see RentalFeesPage for the scale-to-fit wrapper.
// ─────────────────────────────────────────────────────────────────────────────

import { Montserrat } from 'next/font/google'
import { FeeGroup } from '@/lib/rental-fees'

// The source artwork's typeface is Montserrat, not the app's usual Inter
// (`font-sans`) — scoped to this sheet only via next/font/google rather than
// changing the app-wide font.
const montserrat = Montserrat({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' })

export interface RentalFeeSheetProps {
  heading: string
  groups: FeeGroup[]
  notes?: string[]
  photoSrc?: string
}

export function RentalFeeSheet({ heading, groups, notes, photoSrc }: RentalFeeSheetProps) {
  return (
    // Pantone 187 C (sRGB approximation #A6192E) — matches the printed artwork's
    // ink, not the app's general brand red (#C41E2A).
    <div
      className={`rf-sheet relative h-[297mm] w-[210mm] overflow-hidden bg-[#A6192E] text-white ${montserrat.className}`}
    >
      {photoSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoSrc}
          alt=""
          // Explicit width, not w-auto: a replaced element with width:auto takes
          // its intrinsic ratio (~445mm wide here), so object-cover/position never
          // crop and only the photo's left edge (the shoulder) was visible.
          className="absolute inset-y-0 right-0 h-full w-[45%] object-cover"
          style={{ objectPosition: '67% 22%' }}
        />
      )}

      {/*
        Heading, groups, and notes stack in normal flow inside one column so a
        taller heading (this form's 3-line "STATEMENT AND / TRIBUNAL / CHARGES"
        vs. the other form's 2-line heading) pushes the rows down instead of
        overlapping them — two independently absolutely-positioned blocks with
        hardcoded `top` offsets was the bug: it only "worked" for the shorter
        heading. Measured off the source scan: the red panel ends at 55% width
        (115.5mm), so this column is centred on that panel (midpoint 27.5%)
        and sized to its content. The heading itself is narrower (64mm) so it wraps
        at the same points as the artwork. Each fee row is a fixed-width label
        column + a value that starts at a left tab-stop right after it — the
        source does NOT right-justify values to the panel edge, which is what
        the previous `justify-between` layout did (and why long labels wrapped
        and overran the logo below).
      */}
      <div className="absolute top-[70mm] left-[27.5%] w-fit -translate-x-1/2">
        {/* Re-apply Montserrat: globals.css sets font-display (Playfair) on every h1. */}
        <h1 className={`w-[64mm] text-[16pt] leading-[1.3] font-medium tracking-[0.12em] uppercase ${montserrat.className}`}>
          {heading}
        </h1>

        <div className="mt-[15mm] space-y-[5mm]">
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.title && (
                <p className="mb-[1.5mm] text-[10pt] font-semibold">{group.title}</p>
              )}
              <div className="space-y-[1mm]">
                {group.rows.map((row, ri) => (
                  <div key={ri}>
                    <div className="grid grid-cols-[58mm_1fr] items-baseline gap-x-2 text-[8pt] leading-[1.35]">
                      <span>{row.label}</span>
                      <span>{row.value}</span>
                    </div>
                    {row.note && (
                      <p className="text-[7pt] leading-[1.3] whitespace-normal opacity-90">
                        {row.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {notes && notes.length > 0 && (
            <div className="space-y-0.5 pt-[2mm]">
              {notes.map((note, ni) => (
                <p key={ni} className="text-[7pt] leading-[1.3] font-semibold">
                  {note}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sheet-only logo recoloured to PMS 187 C; the shared grants-logo.svg keeps the app brand red. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/grants-logo-187c.svg"
        alt="Grant's"
        className="absolute bottom-[40mm] left-[30mm] w-[52mm]"
      />
    </div>
  )
}

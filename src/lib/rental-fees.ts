// ─────────────────────────────────────────────────────────────────────────────
// Rental fee forms — shared types & default fee data.
//
// Two printed Grant's fee documents recreated as editable, print-ready sheets:
// "Your Fees Proposal" (management/leasing/marketing) and "Statement and
// Tribunal Charges" (admin + VCAT rate card). Values are free text (not
// numbers) so wording like "6% plus gst" or "Included" prints verbatim.
// Standalone, print-only — nothing here is persisted to a proposal.
// ─────────────────────────────────────────────────────────────────────────────

export interface FeeRow {
  label: string
  value: string
  note?: string
}

export interface FeeGroup {
  title?: string
  rows: FeeRow[]
}

export const DEFAULT_FEES_PROPOSAL: FeeGroup[] = [
  {
    rows: [
      { label: 'Management Fee', value: '6% plus gst' },
      { label: 'Leasing fee', value: '1.5 weeks plus gst' },
      { label: 'Marketing package', value: '$300' },
    ],
  },
]

export const FEES_PROPOSAL_NOTES: string[] = [
  "Premiere Listing Australia's No 1 website",
  'Professional daytime photoshoot',
]

export const DEFAULT_TRIBUNAL_CHARGES: FeeGroup[] = [
  {
    title: 'Statements & Administration:',
    rows: [
      { label: 'End of Financial Statement preparation', value: 'Included' },
      { label: 'National Tenancies Database checks', value: '$20 plus gst' },
      { label: 'Registered Mail Notices', value: '$6 plus gst' },
      { label: 'Lease Renewal', value: '$65 plus gst' },
      { label: 'Rent Increase', value: '$75 plus gst' },
      { label: 'Routine Inspection', value: '$60 plus gst' },
      { label: 'Final Inspection', value: '$70 plus gst' },
      { label: 'Compliance Checks  Administration', value: '$50 plus gst' },
      { label: 'Admin / Technology charge', value: '$2 plus gst' },
    ],
  },
  {
    title: 'Tribunal and associated charges',
    rows: [
      { label: 'VCAT Appearance', value: '$475 plus gst', note: '- includes VCAT case preparation' },
      { label: 'VCAT Application', value: '$90 plus gst' },
      { label: 'Bond & Compensation Application', value: '$90 plus gst' },
      { label: 'Warrant of Possession & Attendance', value: '$470 plus gst' },
      { label: 'Fencing Management', value: '$275 plus gst' },
      { label: 'Insurance Claim Management', value: '$275 plus gst' },
      { label: 'Project Management for Refurbishment', value: '$275 plus gst' },
    ],
  },
]

/** Document title for the rental-fees print page (drives the default "Save as PDF" filename). */
export function rentalFeesTitle(address?: string): string {
  const street = (address || '').split(',')[0].trim()
  return street ? `GEA Rental fees - ${street}` : 'GEA Rental fees'
}

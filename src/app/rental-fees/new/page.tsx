'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AddressAutocomplete } from '@/components/Wizard/steps/ClientDetailsStep'
import {
  DEFAULT_FEES_PROPOSAL,
  FEES_PROPOSAL_NOTES,
  DEFAULT_TRIBUNAL_CHARGES,
  FeeGroup,
} from '@/lib/rental-fees'

// Standalone "just the fee forms" builder — mirrors /marketing-plan/new.
// Address + editable fee rows → two one-page printable A4 sheets.
// Print-only: nothing is saved to the database.

const PREVIEW_STORAGE_KEY = 'gea:rental-fees-preview'

function updateRow(
  groups: FeeGroup[],
  gi: number,
  ri: number,
  field: 'label' | 'value',
  text: string
): FeeGroup[] {
  return groups.map((group, i) => {
    if (i !== gi) return group
    return {
      ...group,
      rows: group.rows.map((row, j) => (j === ri ? { ...row, [field]: text } : row)),
    }
  })
}

function addRow(groups: FeeGroup[], gi: number): FeeGroup[] {
  return groups.map((group, i) =>
    i === gi ? { ...group, rows: [...group.rows, { label: '', value: '' }] } : group
  )
}

function removeRow(groups: FeeGroup[], gi: number, ri: number): FeeGroup[] {
  return groups.map((group, i) =>
    i === gi ? { ...group, rows: group.rows.filter((_, j) => j !== ri) } : group
  )
}

function GroupEditor({
  groups,
  onChange,
}: {
  groups: FeeGroup[]
  onChange: (groups: FeeGroup[]) => void
}) {
  return (
    <div className="space-y-6">
      {groups.map((group, gi) => (
        <div key={gi} className="rounded-xl border border-gray-200 bg-white p-5">
          {group.title && (
            <p className="mb-3 font-sans text-sm font-semibold text-gray-700">{group.title}</p>
          )}
          <div className="space-y-2">
            {group.rows.map((row, ri) => (
              <div key={ri} className="flex items-center gap-2">
                <input
                  type="text"
                  value={row.label}
                  onChange={(e) => onChange(updateRow(groups, gi, ri, 'label', e.target.value))}
                  placeholder="Label"
                  className="flex-1 rounded border border-gray-200 px-3 py-2 font-sans text-sm"
                />
                <input
                  type="text"
                  value={row.value}
                  onChange={(e) => onChange(updateRow(groups, gi, ri, 'value', e.target.value))}
                  placeholder="Value"
                  className="w-40 rounded border border-gray-200 px-3 py-2 font-sans text-sm"
                />
                <button
                  type="button"
                  onClick={() => onChange(removeRow(groups, gi, ri))}
                  className="px-2 text-gray-400 hover:text-red-600"
                  aria-label="Remove row"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onChange(addRow(groups, gi))}
            className="mt-3 font-sans text-xs text-gray-500 hover:text-gray-700"
          >
            + add row
          </button>
        </div>
      ))}
    </div>
  )
}

export default function RentalFeesBuilderPage() {
  const [propertyAddress, setPropertyAddress] = useState('')
  const [feesProposal, setFeesProposal] = useState<FeeGroup[]>(DEFAULT_FEES_PROPOSAL)
  const [notes, setNotes] = useState<string[]>(FEES_PROPOSAL_NOTES)
  const [tribunalCharges, setTribunalCharges] = useState<FeeGroup[]>(DEFAULT_TRIBUNAL_CHARGES)

  const openPreview = () => {
    const payload = { feesProposal, tribunalCharges, notes, propertyAddress }
    try {
      localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // ignore storage failures (private browsing, quota)
    }
    window.open('/rental-fees/preview', '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl lowercase text-gray-900">rental fee forms</h1>
            <p className="mt-1 font-sans text-sm text-gray-500">
              Edit the fee schedule, then preview and print both forms.
            </p>
          </div>
          <Link href="/" className="font-sans text-sm text-gray-400 hover:text-gray-700">
            ← back
          </Link>
        </div>

        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
          <AddressAutocomplete value={propertyAddress} onChange={setPropertyAddress} />
        </div>

        <section className="mb-10">
          <h2 className="mb-3 font-display text-xl lowercase text-gray-900">your fees proposal</h2>
          <GroupEditor groups={feesProposal} onChange={setFeesProposal} />
          <div className="mt-4 space-y-2 rounded-xl border border-gray-200 bg-white p-5">
            <p className="font-sans text-xs font-semibold text-gray-500 uppercase">Notes</p>
            {notes.map((note, i) => (
              <input
                key={i}
                type="text"
                value={note}
                onChange={(e) =>
                  setNotes(notes.map((n, j) => (j === i ? e.target.value : n)))
                }
                className="w-full rounded border border-gray-200 px-3 py-2 font-sans text-sm"
              />
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 font-display text-xl lowercase text-gray-900">
            statement and tribunal charges
          </h2>
          <GroupEditor groups={tribunalCharges} onChange={setTribunalCharges} />
        </section>

        <button
          type="button"
          onClick={openPreview}
          className="rounded-lg bg-[#C41E2A] px-6 py-3 font-sans text-sm font-medium text-white hover:bg-[#a51822]"
        >
          preview / print fee forms
        </button>
      </div>
    </div>
  )
}

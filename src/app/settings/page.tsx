'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { uploadHeroImage } from '@/components/Wizard/SavedPhotoPicker'

interface ProfileShape {
  agentName: string | null
  agentTitle: string | null
  agentPhone: string | null
  agentEmail: string | null
  agentPhoto: string | null
  agentBio: string | null
  defaultCommissionRate: number | null
}

const EMPTY: ProfileShape = {
  agentName: '', agentTitle: '', agentPhone: '', agentEmail: '',
  agentPhoto: '', agentBio: '', defaultCommissionRate: null,
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState<ProfileShape>(EMPTY)
  // Raw commission string so decimals (e.g. "1.65") type freely; parsed on save.
  const [commissionStr, setCommissionStr] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/profile')
        if (res.status === 401) { router.push('/login?from=/settings'); return }
        const data = await res.json()
        if (data.profile) {
          setForm({ ...EMPTY, ...data.profile })
          setCommissionStr(data.profile.defaultCommissionRate != null ? String(data.profile.defaultCommissionRate) : '')
        }
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (patch: Partial<ProfileShape>) => setForm((f) => ({ ...f, ...patch }))

  async function save() {
    setSaving(true)
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            ...form,
            defaultCommissionRate: commissionStr.trim() === '' ? null : parseFloat(commissionStr),
          },
        }),
      })
      setSavedAt(new Date().toLocaleTimeString())
    } finally {
      setSaving(false)
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadHeroImage(file)
      set({ agentPhoto: url })
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-charcoal flex items-center justify-center text-white/50 font-sans">Loading…</div>
  }

  return (
    <div className="min-h-screen bg-charcoal text-white px-6 py-12">
      <div className="max-w-xl mx-auto">
        <button onClick={() => router.push('/')} className="font-sans text-sm text-white/50 hover:text-white/80 mb-6">← Back to dashboard</button>
        <h1 className="font-display text-3xl lowercase mb-1">your profile</h1>
        <p className="font-sans text-sm text-white/50 mb-8">These details appear on the proposals you create.</p>

        <div className="space-y-4">
          <Field label="Full name" value={form.agentName || ''} onChange={(v) => set({ agentName: v })} />
          <Field label="Title" value={form.agentTitle || ''} onChange={(v) => set({ agentTitle: v })} />
          <Field label="Direct phone" value={form.agentPhone || ''} onChange={(v) => set({ agentPhone: v })} />
          <Field label="Contact email" value={form.agentEmail || ''} onChange={(v) => set({ agentEmail: v })} />
          <Field label="Short bio" value={form.agentBio || ''} onChange={(v) => set({ agentBio: v })} textarea />

          <div>
            <span className="font-sans text-xs text-white/60 mb-1.5 block">Profile photo</span>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                {form.agentPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.agentPhoto} alt="Your profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-sans text-xs text-white/30">No photo</span>
                )}
              </div>
              <label className="font-sans text-sm px-4 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 transition cursor-pointer">
                {uploading ? 'Uploading…' : form.agentPhoto ? 'Replace photo' : 'Upload photo'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
              </label>
            </div>
          </div>

          <Field
            label="Default commission rate (%)"
            value={commissionStr}
            onChange={(v) => setCommissionStr(v)}
          />
        </div>

        <div className="flex items-center gap-4 mt-10">
          <button onClick={save} disabled={saving} className="font-sans text-sm px-5 py-2.5 rounded-lg bg-brand hover:bg-brand/90 disabled:opacity-50 transition font-medium">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {savedAt && <span className="font-sans text-xs text-white/40">Saved at {savedAt}</span>}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, textarea }: {
  label: string; value: string; onChange: (v: string) => void; textarea?: boolean
}) {
  return (
    <label className="block">
      <span className="font-sans text-xs text-white/60 mb-1.5 block">{label}</span>
      {textarea ? (
        <textarea
          value={value} onChange={(e) => onChange(e.target.value)} rows={4}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 font-sans text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand/60"
        />
      ) : (
        <input
          value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 font-sans text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand/60"
        />
      )}
    </label>
  )
}

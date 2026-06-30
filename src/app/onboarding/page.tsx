'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { uploadHeroImage } from '@/components/Wizard/SavedPhotoPicker'

// Mirror of the server-side step keys (src/lib/user-profile.ts ONBOARDING_STEPS).
const STEPS = [
  { key: 'agent-details', label: 'Your details' },
  { key: 'agent-photo', label: 'Your photo' },
  { key: 'proposal-defaults', label: 'Proposal defaults' },
] as const

type StepKey = (typeof STEPS)[number]['key']

interface ProfileShape {
  agentName: string | null
  agentTitle: string | null
  agentPhone: string | null
  agentEmail: string | null
  agentPhoto: string | null
  agentBio: string | null
  defaultCommissionRate: number | null
  onboardingProgress: Record<string, boolean>
  completed: boolean
}

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [progress, setProgress] = useState<Record<string, boolean>>({})
  const [form, setForm] = useState<ProfileShape>({
    agentName: '', agentTitle: '', agentPhone: '', agentEmail: '',
    agentPhoto: '', agentBio: '', defaultCommissionRate: null,
    onboardingProgress: {}, completed: false,
  })
  // Commission is held as a raw string so decimals (e.g. "1.65") can be typed
  // freely; it is parsed to a number only on save.
  const [commissionStr, setCommissionStr] = useState('')

  // Load existing profile and resume at the first incomplete step.
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/profile')
        if (res.status === 401) { router.push('/login?from=/onboarding'); return }
        const data = await res.json()
        const p = data.profile as ProfileShape | null
        if (p) {
          setForm({ ...form, ...p, onboardingProgress: p.onboardingProgress || {} })
          setCommissionStr(p.defaultCommissionRate != null ? String(p.defaultCommissionRate) : '')
          setProgress(p.onboardingProgress || {})
          const firstIncomplete = STEPS.findIndex((s) => !p.onboardingProgress?.[s.key])
          setStepIndex(firstIncomplete === -1 ? STEPS.length - 1 : firstIncomplete)
        }
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (patch: Partial<ProfileShape>) => setForm((f) => ({ ...f, ...patch }))

  async function saveStep(stepKey: StepKey, opts?: { last?: boolean }) {
    setSaving(true)
    try {
      const fields = {
        agentName: form.agentName, agentTitle: form.agentTitle, agentPhone: form.agentPhone,
        agentEmail: form.agentEmail, agentPhoto: form.agentPhoto, agentBio: form.agentBio,
        defaultCommissionRate: commissionStr.trim() === '' ? null : parseFloat(commissionStr),
      }
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields, completeStep: stepKey, markComplete: opts?.last || undefined }),
      })
      const data = await res.json()
      const newProgress = data.profile?.onboardingProgress || { ...progress, [stepKey]: true }
      setProgress(newProgress)
      if (opts?.last || data.profile?.completed) {
        router.push('/')
        router.refresh()
      } else {
        setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
      }
    } finally {
      setSaving(false)
    }
  }

  function deferForLater() {
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return <div className="min-h-screen bg-charcoal flex items-center justify-center text-white/50 font-sans">Loading…</div>
  }

  const step = STEPS[stepIndex]
  const completedCount = STEPS.filter((s) => progress[s.key]).length

  return (
    <div className="min-h-screen bg-charcoal text-white px-6 py-12">
      <div className="max-w-xl mx-auto">
        <p className="font-sans text-xs tracking-widest uppercase text-brand mb-2">welcome to grants proposals</p>
        <h1 className="font-display text-3xl lowercase mb-1">let&rsquo;s set up your profile</h1>
        <p className="font-sans text-sm text-white/50 mb-8">
          This is how your proposals will appear to clients. You can do part now and finish later.
        </p>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex-1">
              <div className={`h-1 rounded-full ${progress[s.key] ? 'bg-brand' : i === stepIndex ? 'bg-white/40' : 'bg-white/10'}`} />
              <p className={`mt-2 font-sans text-xs ${i === stepIndex ? 'text-white' : 'text-white/40'}`}>{s.label}</p>
            </div>
          ))}
        </div>
        <p className="font-sans text-xs text-white/40 mb-6">{completedCount} of {STEPS.length} complete</p>

        {/* Step body */}
        <div className="space-y-4">
          {step.key === 'agent-details' && (
            <>
              <Field label="Full name" value={form.agentName || ''} onChange={(v) => set({ agentName: v })} placeholder="e.g. Jane Smith" />
              <Field label="Title" value={form.agentTitle || ''} onChange={(v) => set({ agentTitle: v })} placeholder="e.g. Senior Sales Agent" />
              <Field label="Direct phone" value={form.agentPhone || ''} onChange={(v) => set({ agentPhone: v })} placeholder="04xx xxx xxx" />
              <Field label="Contact email" value={form.agentEmail || ''} onChange={(v) => set({ agentEmail: v })} placeholder="you@grantsea.com.au" />
              <Field label="Short bio" value={form.agentBio || ''} onChange={(v) => set({ agentBio: v })} textarea placeholder="A few lines clients will read on your proposals." />
            </>
          )}

          {step.key === 'agent-photo' && (
            <PhotoStep photo={form.agentPhoto} onPhoto={(url) => set({ agentPhoto: url })} />
          )}

          {step.key === 'proposal-defaults' && (
            <Field
              label="Default commission rate (%)"
              value={commissionStr}
              onChange={(v) => setCommissionStr(v)}
              placeholder="e.g. 1.65"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-10">
          <button onClick={deferForLater} className="font-sans text-sm text-white/50 hover:text-white/80 transition">
            Skip for now
          </button>
          <div className="flex gap-3">
            {stepIndex > 0 && (
              <button onClick={() => setStepIndex((i) => i - 1)} className="font-sans text-sm px-4 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 transition">
                Back
              </button>
            )}
            <button
              onClick={() => saveStep(step.key, { last: stepIndex === STEPS.length - 1 })}
              disabled={saving}
              className="font-sans text-sm px-5 py-2.5 rounded-lg bg-brand hover:bg-brand/90 disabled:opacity-50 transition font-medium"
            >
              {saving ? 'Saving…' : stepIndex === STEPS.length - 1 ? 'Finish setup' : 'Save & continue'}
            </button>
          </div>
        </div>
        <p className="font-sans text-xs text-white/30 mt-4">
          Your progress is saved each step — leave any time and resume from where you left off.
        </p>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, textarea }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean
}) {
  return (
    <label className="block">
      <span className="font-sans text-xs text-white/60 mb-1.5 block">{label}</span>
      {textarea ? (
        <textarea
          value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 font-sans text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand/60"
        />
      ) : (
        <input
          value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 font-sans text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand/60"
        />
      )}
    </label>
  )
}

function PhotoStep({ photo, onPhoto }: { photo: string | null; onPhoto: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file: File | undefined) {
    if (!file) return
    setUploading(true); setError('')
    try {
      const url = await uploadHeroImage(file)
      onPhoto(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <span className="font-sans text-xs text-white/60 mb-1.5 block">Profile photo</span>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="Your profile" className="w-full h-full object-cover" />
          ) : (
            <span className="font-sans text-xs text-white/30">No photo</span>
          )}
        </div>
        <label className="font-sans text-sm px-4 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 transition cursor-pointer">
          {uploading ? 'Uploading…' : photo ? 'Replace photo' : 'Upload photo'}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </label>
      </div>
      {error && <p className="font-sans text-xs text-brand mt-2">{error}</p>}
    </div>
  )
}

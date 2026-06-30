// ─────────────────────────────────────────────────────────────────────────────
// Per-user profile store + effective-config resolver.
//
// Each agent has a `user_profiles` row holding agent-level fields and preference
// defaults. Shared agency identity (logo, colours, ABN, offices) stays in the
// agency config; `getEffectiveConfig` overlays an agent's overrides on top so
// agency-wide values still propagate and agents can't drift the brand.
// ─────────────────────────────────────────────────────────────────────────────

import { getDb, PRINCIPAL_EMAIL } from '@/lib/db'
import { getAgencyConfig, DEFAULT_AGENCY_CONFIG } from '@/lib/proposal-generator'
import type { AgencyConfig } from '@/types/proposal'

// Required onboarding steps, in order. `completed` flips true once all are done.
export const ONBOARDING_STEPS = ['agent-details', 'agent-photo', 'proposal-defaults'] as const
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

export interface UserProfile {
  email: string
  agentName: string | null
  agentTitle: string | null
  agentPhone: string | null
  agentEmail: string | null
  agentPhoto: string | null
  agentBio: string | null
  defaultCommissionRate: number | null
  branding: Record<string, unknown> | null
  onboardingProgress: Record<string, boolean>
  completed: boolean
}

interface ProfileRow {
  email: string
  agent_name: string | null
  agent_title: string | null
  agent_phone: string | null
  agent_email: string | null
  agent_photo: string | null
  agent_bio: string | null
  default_commission_rate: number | null
  branding: string | null
  onboarding_progress: string | null
  completed: number
}

function normalise(email: string): string {
  return email.trim().toLowerCase()
}

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    email: row.email,
    agentName: row.agent_name,
    agentTitle: row.agent_title,
    agentPhone: row.agent_phone,
    agentEmail: row.agent_email,
    agentPhoto: row.agent_photo,
    agentBio: row.agent_bio,
    defaultCommissionRate: row.default_commission_rate,
    branding: row.branding ? safeJson(row.branding) : null,
    onboardingProgress: row.onboarding_progress ? safeJson(row.onboarding_progress) ?? {} : {},
    completed: row.completed === 1,
  }
}

function safeJson<T = any>(s: string): T | null {
  try {
    return JSON.parse(s) as T
  } catch {
    return null
  }
}

/** The principal's profile is seeded from the legacy hardcoded agency/agent values
 *  so Stuart's live setup is preserved even before he edits anything. */
function principalSeed(): Partial<UserProfile> {
  const d = DEFAULT_AGENCY_CONFIG
  return {
    agentName: d.agentName,
    agentTitle: d.agentTitle,
    agentPhone: d.agentPhone,
    agentEmail: d.contactEmail,
    agentPhoto: d.agentPhoto,
    agentBio: d.agentBio,
    defaultCommissionRate: d.defaultCommissionRate,
  }
}

export function getProfile(email: string): UserProfile | null {
  const db = getDb()
  const row = db
    .prepare('SELECT * FROM user_profiles WHERE email = ?')
    .get(normalise(email)) as ProfileRow | undefined
  if (row) return rowToProfile(row)

  // Lazy seed for the principal so his profile exists with legacy values on first read.
  if (normalise(email) === PRINCIPAL_EMAIL) {
    const seeded = upsertProfile(email, principalSeed())
    return seeded
  }
  return null
}

export function upsertProfile(email: string, fields: Partial<UserProfile>): UserProfile {
  const db = getDb()
  const e = normalise(email)
  const existing = db
    .prepare('SELECT * FROM user_profiles WHERE email = ?')
    .get(e) as ProfileRow | undefined

  const current: UserProfile = existing
    ? rowToProfile(existing)
    : {
        email: e,
        agentName: null,
        agentTitle: null,
        agentPhone: null,
        agentEmail: null,
        agentPhoto: null,
        agentBio: null,
        defaultCommissionRate: null,
        branding: null,
        onboardingProgress: {},
        completed: false,
      }

  const merged: UserProfile = { ...current, ...fields, email: e }

  db.prepare(
    `INSERT INTO user_profiles
      (email, agent_name, agent_title, agent_phone, agent_email, agent_photo, agent_bio,
       default_commission_rate, branding, onboarding_progress, completed, updated_at)
     VALUES
      (@email, @agent_name, @agent_title, @agent_phone, @agent_email, @agent_photo, @agent_bio,
       @default_commission_rate, @branding, @onboarding_progress, @completed, datetime('now'))
     ON CONFLICT(email) DO UPDATE SET
       agent_name=@agent_name, agent_title=@agent_title, agent_phone=@agent_phone,
       agent_email=@agent_email, agent_photo=@agent_photo, agent_bio=@agent_bio,
       default_commission_rate=@default_commission_rate, branding=@branding,
       onboarding_progress=@onboarding_progress, completed=@completed, updated_at=datetime('now')`
  ).run({
    email: e,
    agent_name: merged.agentName,
    agent_title: merged.agentTitle,
    agent_phone: merged.agentPhone,
    agent_email: merged.agentEmail,
    agent_photo: merged.agentPhoto,
    agent_bio: merged.agentBio,
    default_commission_rate: merged.defaultCommissionRate,
    branding: merged.branding ? JSON.stringify(merged.branding) : null,
    onboarding_progress: JSON.stringify(merged.onboardingProgress ?? {}),
    completed: merged.completed ? 1 : 0,
  })

  return merged
}

/** Record a completed onboarding step; flips `completed` once all required steps are done. */
export function updateOnboardingProgress(email: string, step: OnboardingStep): UserProfile {
  const profile = getProfile(email) ?? upsertProfile(email, {})
  const progress = { ...profile.onboardingProgress, [step]: true }
  const completed = ONBOARDING_STEPS.every((s) => progress[s])
  return upsertProfile(email, { onboardingProgress: progress, completed })
}

export function markComplete(email: string): UserProfile {
  return upsertProfile(email, { completed: true })
}

/**
 * Resolve the effective config used to build a proposal: shared agency identity
 * with this agent's overrides layered on top. Unset agent fields fall back to
 * agency/default values, so nothing is ever blank.
 */
export async function getEffectiveConfig(
  email: string
): Promise<AgencyConfig & { defaultInclusions?: string[] }> {
  const agency = await getAgencyConfig()
  const profile = getProfile(email)
  if (!profile) return agency

  return {
    ...agency,
    agentName: profile.agentName ?? agency.agentName,
    agentTitle: profile.agentTitle ?? agency.agentTitle,
    agentPhone: profile.agentPhone ?? agency.agentPhone,
    agentPhoto: profile.agentPhoto ?? agency.agentPhoto,
    agentBio: profile.agentBio ?? agency.agentBio,
    contactEmail: profile.agentEmail ?? agency.contactEmail,
    defaultCommissionRate: profile.defaultCommissionRate ?? agency.defaultCommissionRate,
  }
}

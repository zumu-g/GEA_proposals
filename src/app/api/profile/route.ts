import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/current-user'
import {
  getProfile,
  upsertProfile,
  updateOnboardingProgress,
  markComplete,
  type OnboardingStep,
  type UserProfile,
} from '@/lib/user-profile'

export const runtime = 'nodejs'

// GET /api/profile — the current user's profile (null-ish empty if not started)
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = getProfile(user.email)
  return NextResponse.json({ profile, isPrincipal: user.isPrincipal })
}

// PUT /api/profile — update the caller's own profile only.
//   body: { fields?: Partial<UserProfile>, completeStep?: OnboardingStep, markComplete?: true }
export async function PUT(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    fields?: Partial<UserProfile>
    completeStep?: OnboardingStep
    markComplete?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Always scope writes to the caller — ignore any email in the payload.
  if (body.fields) {
    const { ...safe } = body.fields
    delete (safe as Record<string, unknown>).email
    upsertProfile(user.email, safe)
  }
  if (body.completeStep) {
    updateOnboardingProgress(user.email, body.completeStep)
  }
  if (body.markComplete) {
    markComplete(user.email)
  }

  return NextResponse.json({ profile: getProfile(user.email) })
}

// ─────────────────────────────────────────────────────────────────────────────
// Current-user resolver for the request layer.
//
// Resolves the acting user from the signed `gea_auth` cookie for use inside API
// route handlers and server components. Centralises what would otherwise be
// duplicated cookie-reading + session-verifying + profile-loading across routes.
// ─────────────────────────────────────────────────────────────────────────────

import { cookies } from 'next/headers'
import { getDb, PRINCIPAL_EMAIL } from '@/lib/db'
import { verifySession } from '@/lib/session'

const COOKIE_NAME = 'gea_auth'

export interface CurrentUser {
  email: string
  isPrincipal: boolean
  profileComplete: boolean
}

/**
 * Resolve the current user from the session cookie, or null when unauthenticated
 * (missing / tampered / expired token).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value
  const email = await verifySession(token)
  if (!email) return null

  const normalised = email.trim().toLowerCase()
  const db = getDb()

  const user = db
    .prepare('SELECT is_principal FROM users WHERE lower(email) = ?')
    .get(normalised) as { is_principal: number } | undefined

  const profile = db
    .prepare('SELECT completed FROM user_profiles WHERE email = ?')
    .get(normalised) as { completed: number } | undefined

  // The principal flag falls back to the configured principal email so the
  // rollout owner is always treated as principal even before the backfill runs.
  const isPrincipal = user?.is_principal === 1 || normalised === PRINCIPAL_EMAIL

  return {
    email: normalised,
    isPrincipal,
    profileComplete: profile?.completed === 1,
  }
}

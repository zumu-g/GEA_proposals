import { NextRequest, NextResponse } from 'next/server'
import { createUser, authenticateUser, userExists } from '@/lib/auth'

export const runtime = 'nodejs'

// Legacy single shared password — kept as a fallback so existing access is not
// broken while user accounts roll out.
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'grants'
const COOKIE_NAME = 'gea_auth'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
const MIN_PASSWORD_LENGTH = 6

function setAuthCookie(response: NextResponse, email: string) {
  response.cookies.set(COOKIE_NAME, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

// POST /api/auth
//   { email, password, mode: 'login' }  → verify account (or legacy password)
//   { email, password, mode: 'signup' } → create account
//   { mode: 'skip' }                    → bypass auth for now (guest session)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const mode: 'login' | 'signup' | 'skip' = body.mode || 'login'

    // ── Skip for now ──────────────────────────────────────────────────────
    if (mode === 'skip') {
      const response = NextResponse.json({ success: true, guest: true })
      setAuthCookie(response, 'guest@grantsea.local')
      return response
    }

    const email: string = body.email
    const password: string = body.password

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }

    // ── Sign up ───────────────────────────────────────────────────────────
    if (mode === 'signup') {
      if (password.length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json(
          { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
          { status: 400 }
        )
      }
      if (userExists(email)) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Try signing in.' },
          { status: 409 }
        )
      }
      createUser(email, password)
      const response = NextResponse.json({ success: true })
      setAuthCookie(response, email.trim().toLowerCase())
      return response
    }

    // ── Log in ────────────────────────────────────────────────────────────
    // Real account first, then fall back to the legacy shared password.
    const validAccount = authenticateUser(email, password)
    const validLegacy = !userExists(email) && password === AUTH_PASSWORD

    if (!validAccount && !validLegacy) {
      return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    setAuthCookie(response, email.trim().toLowerCase())
    return response
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete(COOKIE_NAME)
  return response
}

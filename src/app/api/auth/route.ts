import { NextRequest, NextResponse } from 'next/server'
import { createUser, authenticateUser, userExists } from '@/lib/auth'
import { signSession } from '@/lib/session'

export const runtime = 'nodejs'

const COOKIE_NAME = 'gea_auth'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
const MIN_PASSWORD_LENGTH = 8

// Who may create an account: the agency domain, plus an env-configurable
// allowlist for principals whose personal email isn't on the domain.
const ALLOWED_DOMAINS = ['grantsea.com.au']
const DEFAULT_ALLOWED_EMAILS = ['stuart_grant@me.com']

function signupAllowed(email: string): boolean {
  const normalised = email.trim().toLowerCase()
  const domain = normalised.split('@')[1] || ''
  if (ALLOWED_DOMAINS.includes(domain)) return true
  const extra = (process.env.AUTH_ALLOWED_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return [...DEFAULT_ALLOWED_EMAILS, ...extra].includes(normalised)
}

async function setAuthCookie(response: NextResponse, email: string) {
  const token = await signSession(email, COOKIE_MAX_AGE)
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

// POST /api/auth
//   { email, password, mode: 'login' }  → verify account
//   { email, password, mode: 'signup' } → create account (allowlisted emails only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const mode: 'login' | 'signup' = body.mode === 'signup' ? 'signup' : 'login'

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
      if (!signupAllowed(email)) {
        return NextResponse.json(
          { error: 'Accounts are limited to Grants Estate Agents staff. Use your @grantsea.com.au email.' },
          { status: 403 }
        )
      }
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
      await setAuthCookie(response, email)
      return response
    }

    // ── Log in ────────────────────────────────────────────────────────────
    if (!authenticateUser(email, password)) {
      return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    await setAuthCookie(response, email)
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

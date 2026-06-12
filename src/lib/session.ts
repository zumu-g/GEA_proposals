// ─────────────────────────────────────────────────────────────────────────────
// Signed session tokens — HMAC-SHA256 over "email|expiry" using Web Crypto,
// so the same code runs in Node API routes and the edge middleware.
//
// Token format: base64url(email) + "." + expiryEpochSeconds + "." + hmacHex
// An unsigned / tampered / expired token verifies to null, which middleware
// treats as logged out. Legacy plain-email cookies fail verification too,
// so existing sessions are cleanly invalidated when this ships.
//
// Secret: AUTH_SECRET env (set a long random value on Railway). Falls back to
// AUTH_PASSWORD so the app still works before the env var is configured.
// ─────────────────────────────────────────────────────────────────────────────

const encoder = new TextEncoder()

function secret(): string {
  return process.env.AUTH_SECRET || process.env.AUTH_PASSWORD || 'gea-dev-secret'
}

function b64url(input: string): string {
  // btoa is available in both edge and Node >= 16
  return btoa(unescape(encodeURIComponent(input)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function b64urlDecode(input: string): string | null {
  try {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/')
    return decodeURIComponent(escape(atob(padded)))
  } catch {
    return null
  }
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Create a signed session token for an email, valid for maxAgeSeconds. */
export async function signSession(email: string, maxAgeSeconds: number): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds
  const payload = `${email.trim().toLowerCase()}|${exp}`
  const sig = await hmac(payload)
  return `${b64url(email.trim().toLowerCase())}.${exp}.${sig}`
}

/** Verify a session token. Returns the email, or null if invalid/expired. */
export async function verifySession(token: string | undefined | null): Promise<string | null> {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const email = b64urlDecode(parts[0])
  const exp = parseInt(parts[1], 10)
  if (!email || !Number.isFinite(exp)) return null
  if (exp < Math.floor(Date.now() / 1000)) return null
  const expected = await hmac(`${email}|${exp}`)
  // Constant-time-ish comparison (both are fixed-length hex of equal length)
  if (expected.length !== parts[2].length) return null
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ parts[2].charCodeAt(i)
  return diff === 0 ? email : null
}

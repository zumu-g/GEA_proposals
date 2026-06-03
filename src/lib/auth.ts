// ─────────────────────────────────────────────────────────────────────────────
// User authentication — email + password accounts (self-signup).
//
// Passwords are hashed with Node's built-in scrypt (no external dependency).
// Sessions remain cookie-based and compatible with middleware.ts, which trusts
// the httpOnly `gea_auth` cookie (value = the user's email). DB lookups can't run
// in the edge middleware, so verification of credentials happens here at the API
// layer and the signed-in email is stored in the cookie.
// ─────────────────────────────────────────────────────────────────────────────

import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'
import { getDb } from '@/lib/db'

export interface UserRow {
  id: number
  email: string
  password_hash: string
  created_at: string
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

// scrypt hash, stored as "<salt-hex>:<derived-key-hex>"
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(':')
  if (!salt || !key) return false
  const keyBuf = Buffer.from(key, 'hex')
  const derived = scryptSync(password, salt, 64)
  return keyBuf.length === derived.length && timingSafeEqual(keyBuf, derived)
}

export function getUserByEmail(email: string): UserRow | undefined {
  const db = getDb()
  return db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(normaliseEmail(email)) as UserRow | undefined
}

export function userExists(email: string): boolean {
  return !!getUserByEmail(email)
}

/** Create a new account. Throws if the email is already registered. */
export function createUser(email: string, password: string): UserRow {
  const db = getDb()
  const normalised = normaliseEmail(email)
  if (userExists(normalised)) {
    throw new Error('An account with this email already exists')
  }
  const info = db
    .prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
    .run(normalised, hashPassword(password))
  return db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(info.lastInsertRowid) as UserRow
}

/** Returns true if the email+password match a stored account. */
export function authenticateUser(email: string, password: string): boolean {
  const user = getUserByEmail(email)
  if (!user) return false
  return verifyPassword(password, user.password_hash)
}

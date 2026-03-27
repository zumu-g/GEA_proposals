import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'gea_auth'

// Page routes that require authentication
const PROTECTED_PAGES = ['/', '/dashboard', '/edit']

// API routes that require authentication
const PROTECTED_API = ['/api/dashboard', '/api/proposals', '/api/cron', '/api/poll-inbox']

function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PAGES.some(
    (p) => pathname === p || (p !== '/' && pathname.startsWith(p + '/'))
  )
}

function isProtectedApi(pathname: string): boolean {
  return PROTECTED_API.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
}

function isValidAuthCookie(value: string): boolean {
  // Basic validation: non-empty, contains @, looks like an email
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed.includes('@') && trimmed.includes('.')
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const protectedPage = isProtectedPage(pathname)
  const protectedApi = isProtectedApi(pathname)

  if (!protectedPage && !protectedApi) return NextResponse.next()

  // Check auth cookie with validation
  const authCookie = request.cookies.get(COOKIE_NAME)
  const isAuthenticated = authCookie?.value && isValidAuthCookie(authCookie.value)

  if (!isAuthenticated) {
    if (protectedApi) {
      // API routes return 401 instead of redirect
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Page routes redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated — set cache-control headers to prevent CDN caching
  const response = NextResponse.next()
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')
  response.headers.set('CDN-Cache-Control', 'no-store')
  response.headers.set('Surrogate-Control', 'no-store')
  return response
}

export const config = {
  matcher: [
    // Protected pages
    '/',
    '/dashboard',
    '/dashboard/:path*',
    '/edit/:path*',
    // Protected API routes
    '/api/dashboard',
    '/api/proposals',
    '/api/proposals/:path*',
    '/api/cron',
    '/api/cron/:path*',
    '/api/poll-inbox',
  ],
}

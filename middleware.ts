import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'gea_auth'

// Routes that require authentication
const PROTECTED_PATHS = ['/', '/dashboard', '/edit']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect specific paths (not /proposal/*, /api/*, /_next/*, static files)
  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || (p !== '/' && pathname.startsWith(p + '/'))
  )

  if (!isProtected) return NextResponse.next()

  // Check auth cookie
  const authCookie = request.cookies.get(COOKIE_NAME)
  if (authCookie?.value === 'authenticated') {
    return NextResponse.next()
  }

  // Redirect to login
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/', '/dashboard', '/dashboard/:path*', '/edit/:path*'],
}

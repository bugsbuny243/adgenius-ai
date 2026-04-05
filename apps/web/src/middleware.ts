import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedPaths = ['/dashboard', '/agents', '/runs', '/saved', '/settings']

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const isProtected = protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))

  if (!isProtected) {
    return NextResponse.next()
  }

  const hasSupabaseSessionCookie = req.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token'))

  if (!hasSupabaseSessionCookie) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/agents/:path*', '/runs/:path*', '/saved/:path*', '/settings/:path*'],
}

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedPaths = ['/advertiser', '/publisher', '/admin']

export function middleware(req: NextRequest) {
  if (protectedPaths.some((path) => req.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next()
  }
  return NextResponse.next()
}

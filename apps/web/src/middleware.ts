import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
export function middleware(req: NextRequest){const protectedPaths=['/dashboard','/campaigns','/wallet','/reports','/ai-reports']; const token=req.cookies.get('access_token'); if(protectedPaths.some(p=>req.nextUrl.pathname.startsWith(p)) && !token){return NextResponse.redirect(new URL('/login', req.url))} return NextResponse.next()}

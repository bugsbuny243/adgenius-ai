import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
const protectedPaths=['/dashboard','/brands','/products','/audiences','/campaigns','/generated','/settings','/network','/publisher','/admin']
const authPaths=['/login','/signup']
export function middleware(request: NextRequest){const token=request.cookies.get('access_token')?.value;const p=request.nextUrl.pathname;const isProtected=protectedPaths.some(x=>p.startsWith(x));const isAuth=authPaths.some(x=>p.startsWith(x));if(!token&&isProtected)return NextResponse.redirect(new URL('/login',request.url));if(token&&isAuth)return NextResponse.redirect(new URL('/dashboard',request.url));return NextResponse.next()}

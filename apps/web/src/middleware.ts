import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_EXACT_PATHS = ['/dashboard', '/runs', '/saved', '/settings'];
const PROTECTED_PATH_PREFIXES = ['/dashboard/', '/agents/', '/runs/', '/saved/', '/settings/', '/workspace/'];

function isProtectedPath(pathname: string): boolean {
  if (PROTECTED_EXACT_PATHS.includes(pathname)) {
    return true;
  }

  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function getProjectRef(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    return hostname.split('.')[0] ?? null;
  } catch {
    return null;
  }
}

function extractAccessToken(request: NextRequest, supabaseUrl: string): string | null {
  const projectRef = getProjectRef(supabaseUrl);
  if (!projectRef) {
    return null;
  }

  const cookieName = `sb-${projectRef}-auth-token`;
  const rawCookie = request.cookies.get(cookieName)?.value;

  if (!rawCookie) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(rawCookie)) as string[];
    return Array.isArray(parsed) && typeof parsed[0] === 'string' ? parsed[0] : null;
  } catch {
    return null;
  }
}

async function hasSession(request: NextRequest): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return false;
  }

  const accessToken = extractAccessToken(request, supabaseUrl);

  if (!accessToken) {
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  return !error && Boolean(user);
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  const signedIn = await hasSession(request);

  if (isProtectedPath(pathname) && !signedIn) {
    const signinUrl = new URL('/signin', request.url);
    signinUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(signinUrl);
  }

  if (signedIn && (pathname === '/signin' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/agents/:path*',
    '/runs/:path*',
    '/saved/:path*',
    '/settings/:path*',
    '/workspace/:path*',
    '/signin',
    '/signup',
  ],
};

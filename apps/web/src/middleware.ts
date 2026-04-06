import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PROTECTED_PATHS = ['/dashboard', '/agents', '/runs', '/saved', '/settings'];
const AUTH_PATHS = ['/signin', '/signup'];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function readAccessToken(request: NextRequest): string | null {
  const directToken = request.cookies.get('sb-access-token')?.value;
  if (directToken) {
    return directToken;
  }

  const authCookie = request.cookies
    .getAll()
    .find((cookie) => cookie.name.endsWith('-auth-token'));

  if (!authCookie) {
    return null;
  }

  try {
    const parsed = JSON.parse(authCookie.value) as string[] | { access_token?: string };
    if (Array.isArray(parsed)) {
      return typeof parsed[0] === 'string' ? parsed[0] : null;
    }

    if (typeof parsed === 'object' && parsed !== null) {
      return typeof parsed.access_token === 'string' ? parsed.access_token : null;
    }
  } catch {
    return null;
  }

  return null;
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables are missing in middleware.');
    return false;
  }

  const accessToken = readAccessToken(request);
  if (!accessToken) {
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('Session verification failed in middleware:', error.message);
    return false;
  }

  return Boolean(user);
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const sessionExists = await hasValidSession(request);

  if (isProtectedPath(pathname) && !sessionExists) {
    const signinUrl = new URL('/signin', request.url);
    signinUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(signinUrl);
  }

  if (isAuthPath(pathname) && sessionExists) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/agents/:path*', '/runs/:path*', '/saved/:path*', '/settings/:path*', '/signin', '/signup'],
};

import { NextResponse, type NextRequest } from 'next/server';

const BYPASS_EXACT_PATHS = new Set([
  '/',
  '/api/health',
  '/signin',
  '/signup',
  '/pricing',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/favicon.ico',
  '/robots.txt',
  '/ads.txt',
]);

const BYPASS_PREFIXES = ['/_next'];

const PROTECTED_EXACT_PATHS = ['/dashboard', '/runs', '/saved', '/settings'];
const PROTECTED_PATH_PREFIXES = ['/dashboard/', '/agents/', '/runs/', '/saved/', '/settings/', '/workspace/'];

function shouldBypassMiddleware(pathname: string): boolean {
  if (BYPASS_EXACT_PATHS.has(pathname)) {
    return true;
  }

  return BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

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

function tokenHasNotExpired(token: string): boolean {
  const parts = token.split('.');

  if (parts.length < 2) {
    return false;
  }

  try {
    const encodedPayload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const normalizedPayload = encodedPayload.padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=');
    const payload = JSON.parse(atob(normalizedPayload)) as { exp?: number };

    if (typeof payload.exp !== 'number') {
      return true;
    }

    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function hasSession(request: NextRequest): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return false;
  }

  const accessToken = extractAccessToken(request, supabaseUrl);

  if (!accessToken) {
    return false;
  }

  return tokenHasNotExpired(accessToken);
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  if (shouldBypassMiddleware(pathname)) {
    return NextResponse.next();
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const signedIn = hasSession(request);

  if (!signedIn) {
    const signinUrl = new URL('/signin', request.url);
    signinUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(signinUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|robots.txt|ads.txt).*)'],
};

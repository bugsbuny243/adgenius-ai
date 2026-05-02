import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

function normalizeValue(value?: string | null): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function isPlatformOwner(user: { id?: string | null; email?: string | null } | null): boolean {
  if (!user) return false;

  const ownerUserId = normalizeValue(process.env.OWNER_USER_ID);
  const ownerEmail = normalizeValue(process.env.OWNER_EMAIL)?.toLowerCase();

  const normalizedUserId = normalizeValue(user.id);
  const normalizedEmail = normalizeValue(user.email)?.toLowerCase();

  if (ownerUserId && normalizedUserId === ownerUserId) return true;
  if (ownerEmail && normalizedEmail === ownerEmail) return true;

  return false;
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!isPlatformOwner(user)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/owner/:path*', '/api/owner/:path*', '/owner-panel/:path*', '/api/owner-panel/:path*']
};

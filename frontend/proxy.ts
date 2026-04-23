import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getPublicEnv } from '@/lib/env';

const PROTECTED_ROUTES = ['/dashboard', '/agents', '/projects', '/composer', '/runs', '/saved', '/connections', '/settings', '/upgrade', '/owner'];
const AUTH_ROUTES = ['/signin', '/signup', '/login'];
const SIGN_IN_ROUTE = '/signin';

export async function proxy(request: NextRequest) {
  type CookieToSet = {
    name: string;
    value: string;
    options?: Parameters<NextResponse['cookies']['set']>[2];
  };

  const response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey } = getPublicEnv();

  const isProtectedRoute = PROTECTED_ROUTES.some((route) => request.nextUrl.pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => request.nextUrl.pathname.startsWith(route));
  const isLoginRoute = request.nextUrl.pathname === '/login';

  if (isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = SIGN_IN_ROUTE;
    return NextResponse.redirect(url);
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = SIGN_IN_ROUTE;
      return NextResponse.redirect(url);
    }

    return response;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
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

    if (isProtectedRoute && !user) {
      const url = request.nextUrl.clone();
      url.pathname = SIGN_IN_ROUTE;
      return NextResponse.redirect(url);
    }

    if (isAuthRoute && user) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  } catch (error) {
    console.error('[proxy] auth guard failed', {
      pathname: request.nextUrl.pathname,
      error
    });

    if (isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = SIGN_IN_ROUTE;
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/agents/:path*',
    '/projects/:path*',
    '/composer/:path*',
    '/runs/:path*',
    '/saved/:path*',
    '/connections/:path*',
    '/settings/:path*',
    '/owner/:path*',
    '/login',
    '/signin',
    '/signup'
  ]
};

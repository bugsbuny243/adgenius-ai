import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getPublicEnv } from '@/lib/env';

const PROTECTED_ROUTES = ['/dashboard', '/game-factory', '/settings', '/owner'];
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

  const buildSignInRedirect = () => {
    const url = request.nextUrl.clone();
    url.pathname = SIGN_IN_ROUTE;
    const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    if (nextPath && nextPath !== SIGN_IN_ROUTE) {
      url.searchParams.set('next', nextPath);
    }
    return url;
  };

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
      return NextResponse.redirect(buildSignInRedirect());
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
      return NextResponse.redirect(buildSignInRedirect());
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
      return NextResponse.redirect(buildSignInRedirect());
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/game-factory/:path*',
    '/settings/:path*',
    '/owner/:path*',
    '/login',
    '/signin',
    '/signup'
  ]
};

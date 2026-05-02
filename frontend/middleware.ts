import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

  // 1. Sisteme giriş yapılmamışsa login sayfasına yönlendir
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. KOSCHEI MUTLAK PATRON KONTROLÜ (Sadece Senin ID ve Email'in geçebilir)
  const isOwner = user.id === 'Efa3145b-2a94-48f2-afc0-d94d7b10dbe7' || user.email === 'onur24sel@gmail.com';

  // 3. Patron değilse kapıdan içeri sokma, direkt ana sayfaya fırlat
  if (!isOwner) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

// Bu güvenlik kalkanı sadece patron linklerinde devreye girer
export const config = {
  matcher: [
    '/owner/:path*', 
    '/api/owner/:path*', 
    '/owner-panel/:path*', 
    '/api/owner-panel/:path*'
  ]
};

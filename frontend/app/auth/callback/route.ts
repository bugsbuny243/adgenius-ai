import { NextResponse } from 'next/server';
import { resolveAppOrigin } from '@/lib/app-origin';
import { createSupabaseActionServerClient, isSupabaseServerConfigured } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const appOrigin = resolveAppOrigin({ appOrigin: process.env.APP_ORIGIN, requestUrl: requestUrl.origin });
  const code = requestUrl.searchParams.get('code');
  const nextParam = requestUrl.searchParams.get('next');
  const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard';

  if (!code) {
    return NextResponse.redirect(new URL('/signin?error=missing_code', appOrigin));
  }

  if (!isSupabaseServerConfigured()) {
    return NextResponse.redirect(new URL('/signin?error=supabase_not_configured', appOrigin));
  }

  try {
    const supabase = await createSupabaseActionServerClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.warn('[auth-callback] code exchange failed', {
        code: exchangeError.code,
        status: exchangeError.status
      });
      return NextResponse.redirect(new URL('/signin?error=auth_exchange_failed', appOrigin));
    }

    return NextResponse.redirect(new URL(next, appOrigin));
  } catch (error) {
    console.error('Auth callback failed.', { error });
    return NextResponse.redirect(new URL('/signin?error=callback_failed', appOrigin));
  }
}

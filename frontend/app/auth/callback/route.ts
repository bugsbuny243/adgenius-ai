import { NextResponse } from 'next/server';
import { createSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextParam = requestUrl.searchParams.get('next');
  const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard';

  if (!code) {
    return NextResponse.redirect(new URL('/signin?error=missing_code', request.url));
  }

  if (!isSupabaseServerConfigured()) {
    return NextResponse.redirect(new URL('/signin?error=supabase_not_configured', request.url));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return NextResponse.redirect(new URL(`/signin?error=${encodeURIComponent(exchangeError.message)}`, request.url));
    }

    return NextResponse.redirect(new URL(next, request.url));
  } catch (error) {
    console.error('Auth callback failed.', { error });
    return NextResponse.redirect(new URL('/signin?error=callback_failed', request.url));
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase-server';
import { getOptionalEnv } from '@/lib/env';
import { bootstrapWorkspaceForUser } from '@/lib/workspace';

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

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/signin?error=missing_user', request.url));
    }

    const url = getOptionalEnv('NEXT_PUBLIC_SUPABASE_URL');
    const serviceRole = getOptionalEnv('SUPABASE_SERVICE_ROLE_KEY');

    if (url && serviceRole) {
      const service = createClient(url, serviceRole);
      const emailName = user.email?.split('@')[0] ?? 'Kullanıcı';
      await service.from('profiles').upsert({ id: user.id, full_name: emailName }, { onConflict: 'id' });
    }

    await bootstrapWorkspaceForUser(user.id, user.email);
    return NextResponse.redirect(new URL(next, request.url));
  } catch (error) {
    console.error('Auth callback failed.', { error });
    return NextResponse.redirect(new URL('/signin?error=callback_failed', request.url));
  }
}

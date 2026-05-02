import { NextResponse } from 'next/server';
import { createSupabaseActionServerClient } from '@/lib/supabase-server';
import { createGoogleOAuthClient, getGooglePlayScopes } from '@/lib/google-oauth';

export async function GET(request: Request) {
  const supabase = await createSupabaseActionServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/signin', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/settings/integrations/google-play?status=error&reason=${encodeURIComponent(error)}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings/integrations/google-play?status=error&reason=missing_code', request.url));
  }

  const oauth2Client = createGoogleOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    return NextResponse.redirect(new URL('/settings/integrations/google-play?status=error&reason=missing_refresh_token', request.url));
  }

  const { error: upsertError } = await supabase.from('connected_accounts').upsert(
    {
      user_id: user.id,
      provider: 'google_play',
      access_token: tokens.access_token ?? null,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope ?? getGooglePlayScopes().join(' '),
      token_type: tokens.token_type ?? 'Bearer',
      expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id,provider' }
  );

  if (upsertError) {
    return NextResponse.redirect(
      new URL(`/settings/integrations/google-play?status=error&reason=${encodeURIComponent(upsertError.message)}`, request.url)
    );
  }

  return NextResponse.redirect(new URL('/settings/integrations/google-play?status=connected', request.url));
}

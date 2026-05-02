import { NextResponse } from 'next/server';
import { createSupabaseActionServerClient } from '@/lib/supabase-server';
import { createGoogleOAuthClient, getGooglePlayScopes } from '@/lib/google-oauth';

export async function GET() {
  const supabase = await createSupabaseActionServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/signin', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'));
  }

  const oauth2Client = createGoogleOAuthClient();
  const state = Buffer.from(JSON.stringify({ userId: user.id, ts: Date.now() })).toString('base64url');

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: getGooglePlayScopes(),
    state
  });

  return NextResponse.redirect(authUrl);
}

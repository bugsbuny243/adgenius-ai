import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  exchangeGoogleCodeForTokens,
  fetchGoogleUserProfile,
  fetchYouTubeChannelId,
  normalizeGoogleTokenPayload
} from '@/lib/google-oauth';
import { getServerEnv } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const GOOGLE_STATE_COOKIE = 'koschei_google_oauth_state';
const STATE_TTL_MS = 10 * 60 * 1000;

type StoredOAuthState = {
  state: string;
  userId: string;
  workspaceId: string;
  createdAt: string;
};

function decodeStateCookie(cookieValue: string | undefined): StoredOAuthState | null {
  if (!cookieValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cookieValue, 'base64url').toString('utf8')) as StoredOAuthState;
    if (!parsed.state || !parsed.userId || !parsed.workspaceId || !parsed.createdAt) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function buildAppRedirect(origin: string, status: string): URL {
  return new URL(`/settings?google=${status}`, origin);
}

function clearStateCookie() {
  return {
    name: GOOGLE_STATE_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    expires: new Date(0),
    path: '/'
  };
}

export async function GET(request: Request) {
  const {
    GOOGLE_CLIENT_ID: clientId,
    GOOGLE_CLIENT_SECRET: clientSecret,
    GOOGLE_REDIRECT_URI: redirectUri,
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey
  } = getServerEnv();

  const callbackUrl = new URL(request.url);
  const failRedirect = buildAppRedirect(callbackUrl.origin, 'failed');

  if (!clientId || !clientSecret || !redirectUri || !supabaseUrl || !serviceRoleKey) {
    const response = NextResponse.redirect(failRedirect);
    response.cookies.set(clearStateCookie());
    return response;
  }

  const code = callbackUrl.searchParams.get('code')?.trim();
  const state = callbackUrl.searchParams.get('state')?.trim();

  if (!code || !state) {
    const response = NextResponse.redirect(failRedirect);
    response.cookies.set(clearStateCookie());
    return response;
  }

  const cookieStore = await cookies();
  const storedState = decodeStateCookie(cookieStore.get(GOOGLE_STATE_COOKIE)?.value);

  if (!storedState || storedState.state !== state) {
    const response = NextResponse.redirect(failRedirect);
    response.cookies.set(clearStateCookie());
    return response;
  }

  const isExpired = Date.now() - new Date(storedState.createdAt).getTime() > STATE_TTL_MS;
  if (isExpired) {
    const response = NextResponse.redirect(buildAppRedirect(callbackUrl.origin, 'expired'));
    response.cookies.set(clearStateCookie());
    return response;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || user.id !== storedState.userId) {
    const response = NextResponse.redirect(buildAppRedirect(callbackUrl.origin, 'auth_required'));
    response.cookies.set(clearStateCookie());
    return response;
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('workspace_id', storedState.workspaceId)
    .maybeSingle();

  if (!membership?.workspace_id) {
    const response = NextResponse.redirect(buildAppRedirect(callbackUrl.origin, 'workspace_required'));
    response.cookies.set(clearStateCookie());
    return response;
  }

  try {
    const tokenPayload = await exchangeGoogleCodeForTokens({
      clientId,
      clientSecret,
      redirectUri,
      code
    });
    const normalizedTokens = normalizeGoogleTokenPayload(tokenPayload);

    const [profile, channelId] = await Promise.all([
      fetchGoogleUserProfile(normalizedTokens.accessToken),
      fetchYouTubeChannelId(normalizedTokens.accessToken)
    ]);

    const providerAccountId = profile?.sub ?? profile?.email ?? user.id;

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const { data: existing } = await serviceSupabase
      .from('oauth_connections')
      .select('id, refresh_token, metadata')
      .eq('workspace_id', storedState.workspaceId)
      .eq('user_id', storedState.userId)
      .eq('provider', 'google')
      .maybeSingle();

    const existingMetadata =
      existing?.metadata && typeof existing.metadata === 'object' && !Array.isArray(existing.metadata)
        ? (existing.metadata as Record<string, unknown>)
        : {};

    const mergedMetadata = {
      ...existingMetadata,
      googleProfile: {
        sub: profile?.sub ?? null,
        email: profile?.email ?? null,
        name: profile?.name ?? null
      },
      connectedAt: new Date().toISOString()
    };

    const payload = {
      workspace_id: storedState.workspaceId,
      user_id: storedState.userId,
      provider: 'google',
      provider_account_id: providerAccountId,
      access_token: normalizedTokens.accessToken,
      refresh_token: normalizedTokens.refreshToken ?? existing?.refresh_token ?? null,
      access_token_expires_at: normalizedTokens.accessTokenExpiresAt,
      scopes: normalizedTokens.scopes,
      channel_id: channelId,
      status: 'active',
      metadata: mergedMetadata,
      updated_at: new Date().toISOString()
    };

    const { error: upsertError } = await serviceSupabase.from('oauth_connections').upsert(payload, {
      onConflict: 'workspace_id,provider,user_id'
    });

    if (upsertError) {
      const response = NextResponse.redirect(failRedirect);
      response.cookies.set(clearStateCookie());
      return response;
    }

    const response = NextResponse.redirect(buildAppRedirect(callbackUrl.origin, 'connected'));
    response.cookies.set(clearStateCookie());
    return response;
  } catch {
    const response = NextResponse.redirect(failRedirect);
    response.cookies.set(clearStateCookie());
    return response;
  }
}

import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/env';
import { buildGoogleAuthUrl } from '@/lib/google-oauth';
import { resolveAppOrigin } from '@/lib/app-origin';
import { getWorkspaceContextOrNull } from '@/lib/workspace';

const GOOGLE_STATE_COOKIE = 'koschei_google_oauth_state';
const STATE_TTL_SECONDS = 60 * 10;
type GoogleOAuthStatePayload = {
  state: string;
  userId: string;
  workspaceId: string;
  createdAt: string;
};

function encodeStateCookie(payload: GoogleOAuthStatePayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export async function GET(request: Request) {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_REDIRECT_URI: redirectUri, APP_ORIGIN: appOriginEnv } = getServerEnv();
  const appOrigin = resolveAppOrigin({ appOrigin: appOriginEnv, requestUrl: request.url });

  if (!clientId || !redirectUri) {
    return NextResponse.json({ ok: false, error: 'missing_google_environment' }, { status: 500 });
  }

  const workspace = await getWorkspaceContextOrNull();
  if (!workspace) {
    return NextResponse.redirect(new URL('/signin?google=auth_required', appOrigin));
  }

  const state = randomBytes(32).toString('hex');

  const cookieStore = await cookies();
  cookieStore.set({
    name: GOOGLE_STATE_COOKIE,
    value: encodeStateCookie({
      state,
      userId: workspace.userId,
      workspaceId: workspace.workspaceId,
      createdAt: new Date().toISOString()
    }),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: STATE_TTL_SECONDS,
    path: '/'
  });

  const authUrl = buildGoogleAuthUrl({ clientId, redirectUri, state });
  return NextResponse.redirect(authUrl);
}

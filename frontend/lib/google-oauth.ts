import { GOOGLE_OAUTH_SCOPES, deserializeScopes, serializeScopes } from '@/lib/google-scopes';

type BuildGoogleAuthUrlInput = {
  clientId: string;
  redirectUri: string;
  state: string;
};

type ExchangeGoogleCodeInput = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

export type NormalizedGoogleTokens = {
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiresAt: string | null;
  scopes: string[];
};

export function buildGoogleAuthUrl({ clientId, redirectUri, state }: BuildGoogleAuthUrlInput): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', serializeScopes(GOOGLE_OAUTH_SCOPES));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);

  return url.toString();
}

export async function exchangeGoogleCodeForTokens({
  clientId,
  clientSecret,
  redirectUri,
  code
}: ExchangeGoogleCodeInput): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    throw new Error(`google_token_exchange_failed:${response.status}`);
  }

  return (await response.json()) as GoogleTokenResponse;
}

export function normalizeGoogleTokenPayload(payload: GoogleTokenResponse): NormalizedGoogleTokens {
  if (!payload.access_token) {
    throw new Error('google_access_token_missing');
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    accessTokenExpiresAt:
      typeof payload.expires_in === 'number' ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : null,
    scopes: deserializeScopes(payload.scope)
  };
}

export async function fetchGoogleUserProfile(accessToken: string): Promise<{ sub?: string; email?: string; name?: string } | null> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as { sub?: string; email?: string; name?: string };
}

export async function fetchYouTubeChannelId(accessToken: string): Promise<string | null> {
  const url = new URL('https://www.googleapis.com/youtube/v3/channels');
  url.searchParams.set('part', 'id');
  url.searchParams.set('mine', 'true');
  url.searchParams.set('maxResults', '1');

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { items?: Array<{ id?: string }> };
  return payload.items?.[0]?.id ?? null;
}

export async function fetchBloggerBlogId(accessToken: string): Promise<string | null> {
  const url = new URL('https://www.googleapis.com/blogger/v3/users/self/blogs');
  url.searchParams.set('maxResults', '1');

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { items?: Array<{ id?: string }> };
  return payload.items?.[0]?.id ?? null;
}

const ANDROID_PUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const GOOGLE_OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';

type AuthUrlOptions = {
  access_type?: 'offline' | 'online';
  prompt?: string;
  scope: string[];
  state?: string;
  include_granted_scopes?: boolean;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
};

function getOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth yapılandırması eksik. GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET ve GOOGLE_OAUTH_REDIRECT_URI tanımlanmalı.');
  }

  return { clientId, clientSecret, redirectUri };
}

class GoogleOAuthClient {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
  ) {}

  generateAuthUrl(options: AuthUrlOptions) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: options.scope.join(' '),
    });

    if (options.access_type) params.set('access_type', options.access_type);
    if (options.prompt) params.set('prompt', options.prompt);
    if (options.state) params.set('state', options.state);
    if (typeof options.include_granted_scopes === 'boolean') params.set('include_granted_scopes', String(options.include_granted_scopes));

    return `${GOOGLE_OAUTH_AUTH_URL}?${params.toString()}`;
  }

  async getToken(code: string): Promise<{ tokens: TokenResponse }> {
    const body = new URLSearchParams({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google token alınamadı: ${response.status} ${errorText}`);
    }

    const json = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      scope?: string;
      token_type?: string;
      expires_in?: number;
    };

    return {
      tokens: {
        access_token: json.access_token,
        refresh_token: json.refresh_token,
        scope: json.scope,
        token_type: json.token_type,
        expiry_date: json.expires_in ? Date.now() + json.expires_in * 1000 : undefined,
      },
    };
  }
}

export function createGoogleOAuthClient() {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();
  return new GoogleOAuthClient(clientId, clientSecret, redirectUri);
}

export function getGooglePlayScopes() {
  return [ANDROID_PUBLISHER_SCOPE];
}

import { google } from 'googleapis';

const ANDROID_PUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

function getOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth yapılandırması eksik. GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET ve GOOGLE_OAUTH_REDIRECT_URI tanımlanmalı.');
  }

  return { clientId, clientSecret, redirectUri };
}

export function createGoogleOAuthClient() {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getGooglePlayScopes() {
  return [ANDROID_PUBLISHER_SCOPE];
}

export const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/blogger'
] as const;

export function serializeScopes(scopes: readonly string[]): string {
  return scopes.join(' ');
}

export function deserializeScopes(scopeValue: string | null | undefined): string[] {
  if (!scopeValue) {
    return [];
  }

  return scopeValue
    .split(' ')
    .map((scope) => scope.trim())
    .filter(Boolean);
}

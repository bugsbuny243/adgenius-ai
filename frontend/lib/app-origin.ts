const DEFAULT_PUBLIC_ORIGIN = 'https://tradepigloball.co';

const PRIVATE_HOST_PATTERNS = [/^localhost$/i, /^127\./, /^0\.0\.0\.0$/, /^\[::1\]$/, /^::1$/, /\.local$/i, /\.internal$/i];

function normalizeOrigin(candidate: string | null | undefined): string | null {
  if (!candidate) return null;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    const hostname = parsed.hostname.trim();

    if (!hostname || PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname))) {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

export function resolveAppOrigin(params?: { appOrigin?: string | null; requestUrl?: string | URL | null }): string {
  const fromEnv = normalizeOrigin(params?.appOrigin ?? null);
  if (fromEnv) return fromEnv;

  const requestValue = params?.requestUrl ? String(params.requestUrl) : null;
  const fromRequest = normalizeOrigin(requestValue);
  if (fromRequest) return fromRequest;

  return DEFAULT_PUBLIC_ORIGIN;
}


const DEFAULT_BACKEND_URL = 'http://localhost:4000';
const FETCH_TIMEOUT_MS = 10_000;

function ensureHttpsUrl(value: string, label: string): string {
  const trimmed = value.trim().replace(/\/$/, '');

  if (trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('http://localhost') || trimmed.startsWith('http://127.0.0.1')) {
    return trimmed;
  }

  throw new Error(`${label} must start with https:// in production deployments. Received: "${trimmed}".`);
}

export async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    console.error(`[backend-api] Request failed for URL: ${url}`, error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getBackendApiUrl(): string {
  const value = process.env.BACKEND_API_URL?.trim();
  const raw = value && value.length > 0 ? value : DEFAULT_BACKEND_URL;
  return ensureHttpsUrl(raw, 'BACKEND_API_URL');
}

export async function proxyToBackend(request: Request, path: string, methodOverride?: string) {
  const backendUrl = getBackendApiUrl();
  const url = `${backendUrl}${path}`;
  const method = methodOverride ?? request.method;
  const auth = request.headers.get('authorization') ?? '';
  const contentType = request.headers.get('content-type') ?? 'application/json';
  const body = method === 'GET' ? undefined : await request.text();

  const response = await fetchWithTimeout(url, {
    method,
    headers: {
      ...(auth ? { Authorization: auth } : {}),
      ...(body ? { 'Content-Type': contentType } : {})
    },
    body,
    cache: 'no-store'
  });

  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' }
  });
}

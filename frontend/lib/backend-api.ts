const DEFAULT_BACKEND_URL = 'http://localhost:4000';

export function getBackendApiUrl(): string {
  const value = process.env.BACKEND_API_URL?.trim();
  return value && value.length > 0 ? value.replace(/\/$/, '') : DEFAULT_BACKEND_URL;
}

export async function proxyToBackend(request: Request, path: string, methodOverride?: string) {
  const backendUrl = getBackendApiUrl();
  const url = `${backendUrl}${path}`;
  const method = methodOverride ?? request.method;
  const auth = request.headers.get('authorization') ?? '';
  const contentType = request.headers.get('content-type') ?? 'application/json';
  const body = method === 'GET' ? undefined : await request.text();

  const response = await fetch(url, {
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

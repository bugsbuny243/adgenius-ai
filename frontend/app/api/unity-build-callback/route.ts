import { getBackendApiUrl } from '@/lib/backend-api';

// Temporary proxy route: secret-backed logic moved to backend service.
export async function POST(request: Request) {
  const response = await fetch(`${getBackendApiUrl()}/unity-build-callback`, {
    method: 'POST',
    headers: { 'Content-Type': request.headers.get('content-type') ?? 'application/json' },
    body: await request.text(),
    cache: 'no-store'
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' }
  });
}

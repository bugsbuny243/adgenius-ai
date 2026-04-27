import { getBackendApiUrl } from '@/lib/backend-api';

// Temporary proxy route: secret-backed logic moved to backend service.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  const response = await fetch(`${getBackendApiUrl()}/game-factory/build-status${query ? `?${query}` : ''}`, {
    method: 'GET',
    headers: {
      ...(request.headers.get('authorization') ? { Authorization: request.headers.get('authorization') as string } : {})
    },
    cache: 'no-store'
  });

  const payload = await response.text();
  return new Response(payload, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' }
  });
}

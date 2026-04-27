import { getBackendApiUrl } from '@/lib/backend-api';

// Temporary proxy route: secret-backed logic moved to backend service.
export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  const response = await fetch(`${getBackendApiUrl()}/game-factory/build-status?jobId=${encodeURIComponent(jobId)}`, {
    method: 'GET',
    headers: {
      ...(request.headers.get('authorization') ? { Authorization: request.headers.get('authorization') as string } : {})
    },
    cache: 'no-store'
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' }
  });
}

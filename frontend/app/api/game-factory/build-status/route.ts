import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { refreshSingleBuildStatus } from '@/app/api/game-factory/_builds';

export async function GET(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  const { searchParams } = new URL(request.url);
  const jobId = String(searchParams.get('jobId') ?? '').trim();
  if (!jobId) return json({ ok: false, error: 'jobId zorunlu.' }, 400);

  const refreshed = await refreshSingleBuildStatus(context, jobId);
  return json(refreshed.body, refreshed.status);
}

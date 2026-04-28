import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { refreshSingleBuildStatus } from '@/app/api/game-factory/_builds';

export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const authContext = await getApiAuthContext(request);
  if (authContext instanceof Response) return authContext;

  const { jobId } = await context.params;
  const refreshed = await refreshSingleBuildStatus(authContext, String(jobId ?? '').trim());
  return json(refreshed.body, refreshed.status);
}

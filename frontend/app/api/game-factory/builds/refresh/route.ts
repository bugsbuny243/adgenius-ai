import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { refreshProjectBuilds } from '@/app/api/game-factory/_builds';

export async function POST(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  const payload = (await request.json().catch(() => null)) as { projectId?: string | null } | null;
  const projectId = String(payload?.projectId ?? '').trim();
  if (!projectId) return json({ ok: false, error: 'projectId zorunlu.' }, 400);

  const refreshed = await refreshProjectBuilds(context, projectId);
  return json(refreshed.body, refreshed.status);
}

import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { requireActiveGameAgentPackage } from '@/lib/game-agent-access';
import { runReleasePreflight } from '@/lib/game-factory/release-preflight';

type PreflightPayload = {
  projectId?: string | null;
};

export async function POST(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  const packageGateResponse = await requireActiveGameAgentPackage(context.supabase, context.userId, context.workspaceId);
  if (packageGateResponse) return packageGateResponse;

  const body = (await request.json().catch(() => null)) as PreflightPayload | null;
  const projectId = String(body?.projectId ?? '').trim();
  if (!projectId) return json({ ok: false, error: 'projectId zorunlu.' }, 400);

  const result = await runReleasePreflight({
    supabase: context.supabase,
    projectId,
    userId: context.userId,
    workspaceId: context.workspaceId
  });

  return json({
    ok: result.ok,
    status: result.status,
    blockers: result.blockers,
    warnings: result.warnings
  });
}

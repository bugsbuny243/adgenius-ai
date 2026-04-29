import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { requireActiveGameAgentPackage } from '@/lib/game-agent-access';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

type ApproveRequest = { projectId: string };

export async function POST(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  const body = (await request.json()) as Partial<ApproveRequest>;
  const projectId = body.projectId?.trim();
  if (!projectId) return json({ ok: false, error: 'projectId zorunlu.' }, 400);

  const serviceRole = getSupabaseServiceRoleClient();
  const { data: project } = await serviceRole
    .from('unity_game_projects')
    .select('id, workspace_id')
    .eq('id', projectId)
    .maybeSingle();

  if (!project) return json({ ok: false, error: 'Proje bulunamadı.' }, 404);

  const projectWorkspaceId = String(project.workspace_id ?? '').trim();
  if (!projectWorkspaceId) return json({ ok: false, error: 'Proje bulunamadı.' }, 404);

  const { data: membership } = await serviceRole
    .from('workspace_members')
    .select('id')
    .eq('user_id', context.userId)
    .eq('workspace_id', projectWorkspaceId)
    .maybeSingle();
  if (!membership) return json({ ok: false, error: 'Proje bulunamadı.' }, 404);

  const packageGateResponse = await requireActiveGameAgentPackage(context.supabase, context.userId, projectWorkspaceId);
  if (packageGateResponse) return packageGateResponse;

  const { data, error } = await serviceRole
    .from('unity_game_projects')
    .update({ approval_status: 'approved', status: 'approved' })
    .eq('id', projectId)
    .eq('workspace_id', projectWorkspaceId)
    .select('id')
    .maybeSingle();

  if (error) return json({ ok: false, error: error.message }, 400);
  if (!data?.id) return json({ ok: false, error: 'Proje bulunamadı.' }, 404);

  return json({ ok: true, projectId: data.id });
}

import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';

type ApproveRequest = { projectId: string };

export async function POST(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  const body = (await request.json()) as Partial<ApproveRequest>;
  const projectId = body.projectId?.trim();
  if (!projectId) return json({ ok: false, error: 'projectId zorunlu.' }, 400);

  const { error } = await context.supabase
    .from('unity_game_projects')
    .update({ approval_status: 'approved', status: 'approved' })
    .eq('id', projectId)
    .eq('workspace_id', context.workspaceId)
    .eq('user_id', context.userId);

  if (error) return json({ ok: false, error: error.message }, 400);

  return json({ ok: true });
}

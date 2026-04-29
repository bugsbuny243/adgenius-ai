import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { requireActiveGameAgentPackage } from '@/lib/game-agent-access';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

export async function POST(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  const packageGateResponse = await requireActiveGameAgentPackage(context.supabase, context.userId, context.workspaceId);
  if (packageGateResponse) return packageGateResponse;

  const payload = (await request.json().catch(() => null)) as { prompt?: string | null } | null;
  const prompt = String(payload?.prompt ?? '').trim();

  if (!prompt) return json({ ok: false, error: 'prompt zorunlu.' }, 400);

  const serviceRole = getSupabaseServiceRoleClient();
  const { data: project, error } = await serviceRole
    .from('unity_game_projects')
    .insert({
      workspace_id: context.workspaceId,
      user_id: context.userId,
      app_name: prompt.slice(0, 80),
      package_name: `com.koschei.${Date.now()}`,
      status: 'draft',
      metadata: { source: 'next_generate', prompt }
    })
    .select('id, app_name, status, created_at')
    .single();

  if (error || !project) {
    return json({ ok: false, error: error?.message ?? 'Proje oluşturulamadı.' }, 400);
  }

  return json({ ok: true, project });
}

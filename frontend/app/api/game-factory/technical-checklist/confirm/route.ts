import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { requireActiveGameAgentPackage } from '@/lib/game-agent-access';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

type ConfirmTechnicalChecklistRequest = {
  projectId?: string;
  confirmedItems?: string[];
};

const REQUIRED_CONFIRMATIONS = [
  'infra_ack',
  'backend_ack',
  'google_play_ack',
  'monetization_ack',
  'publish_blocker_ack'
] as const;

export async function POST(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  const packageGateResponse = await requireActiveGameAgentPackage(context.supabase, context.userId, context.workspaceId);
  if (packageGateResponse) return packageGateResponse;

  const payload = (await request.json().catch(() => null)) as ConfirmTechnicalChecklistRequest | null;
  const projectId = String(payload?.projectId ?? '').trim();
  const confirmedItems = Array.isArray(payload?.confirmedItems) ? payload?.confirmedItems.filter((v) => typeof v === 'string') : [];

  if (!projectId) return json({ ok: false, error: 'projectId zorunlu.' }, 400);

  const serviceRole = getSupabaseServiceRoleClient();
  const { data: project } = await serviceRole
    .from('unity_game_projects')
    .select('id, project_id')
    .eq('id', projectId)
    .eq('workspace_id', context.workspaceId)
    .eq('user_id', context.userId)
    .maybeSingle();

  if (!project) return json({ ok: false, error: 'Proje bulunamadı.' }, 404);

  const missing = REQUIRED_CONFIRMATIONS.filter((item) => !confirmedItems.includes(item));
  if (missing.length > 0) {
    return json({ ok: false, error: 'Tüm teknik gereksinim onay kutuları işaretlenmelidir.', missing }, 400);
  }

  const nowIso = new Date().toISOString();
  const upsertPayload = {
    workspace_id: context.workspaceId,
    project_id: project.project_id ?? null,
    unity_game_project_id: projectId,
    checklist_type: 'pre_build',
    required_items: REQUIRED_CONFIRMATIONS,
    confirmed_items: confirmedItems,
    status: 'confirmed',
    confirmed_by: context.userId,
    confirmed_at: nowIso,
    updated_at: nowIso
  };

  const { data: existing } = await serviceRole
    .from('game_technical_checklists')
    .select('id')
    .eq('unity_game_project_id', projectId)
    .eq('workspace_id', context.workspaceId)
    .eq('checklist_type', 'pre_build')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const write = existing?.id
    ? serviceRole.from('game_technical_checklists').update(upsertPayload).eq('id', existing.id)
    : serviceRole.from('game_technical_checklists').insert(upsertPayload);

  const { error } = await write;
  if (error) return json({ ok: false, error: error.message }, 400);

  return json({ ok: true });
}

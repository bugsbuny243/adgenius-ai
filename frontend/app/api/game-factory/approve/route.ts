import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { requireActiveGameAgentPackage } from '@/lib/game-agent-access';

type ApproveRequest = {
  projectId: string;
  googlePlayAccountStatus?: 'user_has_account' | 'artifact_only' | 'user_needs_setup';
  confirmations?: {
    understandPlayConsoleRequired?: boolean;
    understandUserResponsibility?: boolean;
  };
};

export async function POST(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  const packageGateResponse = await requireActiveGameAgentPackage(context.supabase, context.userId, context.workspaceId);
  if (packageGateResponse) return packageGateResponse;

  const body = (await request.json()) as Partial<ApproveRequest>;
  const projectId = body.projectId?.trim();
  if (!projectId) return json({ ok: false, error: 'projectId zorunlu.' }, 400);
  const googlePlayAccountStatus = body.googlePlayAccountStatus;
  if (!googlePlayAccountStatus || !['user_has_account', 'artifact_only', 'user_needs_setup'].includes(googlePlayAccountStatus)) {
    return json({ ok: false, error: 'Google Play hesap durumu seçilmelidir.' }, 400);
  }
  if (!body.confirmations?.understandPlayConsoleRequired || !body.confirmations?.understandUserResponsibility) {
    return json({ ok: false, error: 'Google Play checklist onayları zorunludur.' }, 400);
  }

  const deliveryMode = googlePlayAccountStatus === 'artifact_only'
    ? 'apk_aab_only'
    : googlePlayAccountStatus === 'user_has_account'
      ? 'play_publish'
      : 'setup_assisted';
  const publishingBlockers = googlePlayAccountStatus === 'artifact_only'
    ? ['APK/AAB hazır, Play Store yayını için Google Play Console hesabı gerekli.']
    : googlePlayAccountStatus === 'user_needs_setup'
      ? ['Google Play Console setup assistance pending. Publishing waits for verified integration.']
      : [];

  const { error: readinessError } = await context.supabase
    .from('google_play_readiness')
    .upsert({
      unity_game_project_id: projectId,
      project_id: projectId,
      workspace_id: context.workspaceId,
      user_id: context.userId,
      package_name: null,
      google_email: context.userEmail,
      has_google_account: true,
      has_play_console: googlePlayAccountStatus === 'user_has_account',
      has_service_account: false,
      service_account_valid: false,
      permissions_valid: false,
      app_access_valid: false,
      status: googlePlayAccountStatus === 'user_has_account' ? 'needs_setup' : 'not_connected',
      blockers: publishingBlockers,
      checked_at: new Date().toISOString(),
      delivery_mode: deliveryMode,
      google_play_account_status: googlePlayAccountStatus,
      confirmed_requirements: {
        checklist_selection: googlePlayAccountStatus,
        understand_play_store_requires_user_owned_account: true,
        understand_user_responsibility: true,
        publishing_blockers: publishingBlockers
      },
      confirmed_at: new Date().toISOString()
    }, { onConflict: 'unity_game_project_id' });

  if (readinessError) return json({ ok: false, error: readinessError.message }, 400);

  const { data: project, error: projectError } = await context.supabase
    .from('unity_game_projects')
    .select('game_brief')
    .eq('id', projectId)
    .eq('workspace_id', context.workspaceId)
    .eq('user_id', context.userId)
    .maybeSingle();
  if (projectError) return json({ ok: false, error: projectError.message }, 400);
  const existingBrief = (project?.game_brief && typeof project.game_brief === 'object' && !Array.isArray(project.game_brief))
    ? project.game_brief as Record<string, unknown>
    : {};

  const { error } = await context.supabase
    .from('unity_game_projects')
    .update({
      approval_status: 'approved',
      status: 'approved',
      game_brief: {
        ...existingBrief,
        google_play_required: googlePlayAccountStatus !== 'artifact_only',
        google_play_account_status: googlePlayAccountStatus,
        publishing_blockers: publishingBlockers,
        delivery_mode: deliveryMode
      }
    })
    .eq('id', projectId)
    .eq('workspace_id', context.workspaceId)
    .eq('user_id', context.userId);

  if (error) return json({ ok: false, error: error.message }, 400);

  return json({ ok: true });
}

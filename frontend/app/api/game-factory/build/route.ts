import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { requireActiveGameAgentPackage } from '@/lib/game-agent-access';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';
import { getBuilds, triggerBuild, UnityApiError } from '@/lib/server/unity-cloud-build';

function isValidPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export async function POST(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  const packageGateResponse = await requireActiveGameAgentPackage(context.supabase, context.userId, context.workspaceId);
  if (packageGateResponse) return packageGateResponse;

  const payload = (await request.json().catch(() => null)) as { projectId?: string | null } | null;
  const projectId = String(payload?.projectId ?? '').trim();
  if (!projectId) return json({ ok: false, error: 'projectId zorunlu.' }, 400);

  const serviceRole = getSupabaseServiceRoleClient();
  const { data: project } = await serviceRole
    .from('unity_game_projects')
    .select('id, approval_status, game_brief')
    .eq('id', projectId)
    .eq('workspace_id', context.workspaceId)
    .eq('user_id', context.userId)
    .maybeSingle();

  if (!project) return json({ ok: false, error: 'Proje bulunamadı.' }, 404);
  if (project.approval_status !== 'approved') return json({ ok: false, error: 'Proje onay bekliyor.' }, 403);

  const brief = (project.game_brief ?? {}) as {
    backendRequired?: boolean;
    multiplayerRequired?: boolean;
    iapRequired?: boolean;
    adsRequired?: boolean;
    infrastructureRequired?: boolean;
  };
  const needsTechnicalChecklist = Boolean(
    brief.infrastructureRequired || brief.backendRequired || brief.multiplayerRequired || brief.iapRequired || brief.adsRequired
  );

  if (needsTechnicalChecklist) {
    const { data: checklist } = await serviceRole
      .from('game_technical_checklists')
      .select('status')
      .eq('unity_game_project_id', projectId)
      .eq('workspace_id', context.workspaceId)
      .eq('checklist_type', 'pre_build')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!checklist || checklist.status !== 'confirmed') {
      return json({ ok: false, error: 'Teknik gereksinimler onaylanmadan build başlatılamaz.' }, 403);
    }
  }

  const buildTargetId = process.env.UNITY_BUILD_TARGET_ID?.trim();
  if (!buildTargetId) return json({ ok: false, error: 'UNITY_BUILD_TARGET_ID eksik.' }, 500);

  let unityResponse: Awaited<ReturnType<typeof triggerBuild>>;
  let recoveredBuild: Awaited<ReturnType<typeof getBuilds>>[number] | null = null;

  try {
    unityResponse = await triggerBuild(buildTargetId);
  } catch (error) {
    const unityError = error instanceof UnityApiError ? error : new UnityApiError('Unity build tetikleme hatası.');
    const queuedAt = new Date().toISOString();

    await serviceRole.from('unity_build_jobs').insert({
      unity_game_project_id: projectId,
      workspace_id: context.workspaceId,
      user_id: context.userId,
      requested_by: context.userId,
      build_target: 'android',
      build_type: 'release',
      status: 'failed',
      queued_at: queuedAt,
      error_message: unityError.message
    });

    await serviceRole
      .from('unity_game_projects')
      .update({ status: 'failed' })
      .eq('id', projectId)
      .eq('workspace_id', context.workspaceId)
      .eq('user_id', context.userId);

    return json({ ok: false, error: 'Unity build başlatılamadı.' }, 502);
  }

  const hasValidUnityBuildNumber = isValidPositiveInt(unityResponse.build);
  if (!hasValidUnityBuildNumber) {
    try {
      const latestBuilds = await getBuilds(buildTargetId, 10);
      recoveredBuild = latestBuilds.find((build) => build.buildTargetId === buildTargetId) ?? latestBuilds[0] ?? null;
    } catch {
      recoveredBuild = null;
    }
  }

  const unityBuildNumber =
    hasValidUnityBuildNumber
      ? unityResponse.build
      : isValidPositiveInt(recoveredBuild?.build)
        ? recoveredBuild.build
        : null;
  const effectiveUnityStatus = recoveredBuild?.status ?? unityResponse.status;
  const initialJobStatus =
    effectiveUnityStatus === 'sentToBuilder' || effectiveUnityStatus === 'started' || effectiveUnityStatus === 'restarted'
      ? 'running'
      : 'queued';
  const effectiveDownloadUrl = recoveredBuild?.links?.download_primary?.href ?? unityResponse.links?.download_primary?.href ?? null;

  const { data: insertedJob, error: jobError } = await serviceRole
    .from('unity_build_jobs')
    .insert({
      unity_game_project_id: projectId,
      workspace_id: context.workspaceId,
      user_id: context.userId,
      requested_by: context.userId,
      build_target: 'android',
      build_type: 'release',
      status: initialJobStatus,
      queued_at: new Date().toISOString(),
      metadata: {
        ...(unityBuildNumber ? { unityBuildNumber } : {}),
        unityBuildTargetId: buildTargetId,
        unityReturnedBuildTargetId: unityResponse.buildTargetId,
        unityStatus: effectiveUnityStatus,
        unityDownloadUrl: effectiveDownloadUrl,
        needsUnityBuildNumberRecovery: !unityBuildNumber
      }
    })
    .select('id')
    .single();

  if (jobError || !insertedJob) {
    return json({ ok: false, error: jobError?.message ?? 'Build kaydı oluşturulamadı.' }, 400);
  }

  await serviceRole.from('unity_game_projects').update({ status: 'building' }).eq('id', projectId);
  return json({ ok: true, jobId: insertedJob.id, unityBuildNumber: unityBuildNumber ?? null });
}

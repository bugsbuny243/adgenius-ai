import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { requireActiveGameAgentPackage } from '@/lib/game-agent-access';
import { writeUnityBuildConfigToRepo } from '@/lib/server/github-unity-build-config';
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
    .select(
      'id, approval_status, game_brief, app_name, package_name, current_version_code, current_version_name, unity_repo_owner, unity_repo_name, unity_branch'
    )
    .eq('id', projectId)
    .eq('workspace_id', context.workspaceId)
    .eq('user_id', context.userId)
    .maybeSingle();

  if (!project) return json({ ok: false, error: 'Proje bulunamadı.' }, 404);
  if (project.approval_status !== 'approved') return json({ ok: false, error: 'Proje onay bekliyor.' }, 403);

  const briefTitle = String((project.game_brief as { title?: unknown } | null)?.title ?? '').trim();
  const briefName = String((project.game_brief as { name?: unknown } | null)?.name ?? '').trim();
  const appName = String(project.app_name ?? '').trim() || briefTitle || briefName;
  const packageName = String(project.package_name ?? '').trim();
  const versionCodeRaw = Number(project.current_version_code ?? 0);
  const versionCode = Number.isInteger(versionCodeRaw) && versionCodeRaw > 0 ? versionCodeRaw : 1;
  const versionName = String(project.current_version_name ?? '').trim() || '1.0.0';
  const unityRepoOwner = String(process.env.GITHUB_UNITY_REPO_OWNER ?? '').trim() || String(project.unity_repo_owner ?? '').trim();
  const unityRepoName = String(process.env.GITHUB_UNITY_REPO_NAME ?? '').trim() || String(project.unity_repo_name ?? '').trim();
  const unityBranch = String(process.env.GITHUB_UNITY_REPO_BRANCH ?? '').trim() || String(project.unity_branch ?? '').trim() || 'main';

  if (!appName) return json({ ok: false, error: 'app_name eksik.' }, 400);
  if (!packageName) return json({ ok: false, error: 'package_name eksik.' }, 400);
  if (!unityRepoOwner || !unityRepoName) {
    return json({ ok: false, error: 'Unity GitHub repo bilgileri eksik.' }, 400);
  }

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

  const { data: insertedJob, error: initialJobError } = await serviceRole
    .from('unity_build_jobs')
    .insert({
      unity_game_project_id: projectId,
      workspace_id: context.workspaceId,
      user_id: context.userId,
      requested_by: context.userId,
      build_target: 'android',
      build_type: 'release',
      status: 'queued',
      queued_at: new Date().toISOString(),
      version_code: versionCode,
      version_name: versionName,
      branch: unityBranch
    })
    .select('id')
    .single();

  if (initialJobError || !insertedJob) {
    return json({ ok: false, error: initialJobError?.message ?? 'Build kaydı oluşturulamadı.' }, 400);
  }

  let configWrite: { branch: string; commitSha: string | null; path: string } | null = null;

  try {
    const writtenConfig = await writeUnityBuildConfigToRepo({
      owner: unityRepoOwner,
      repo: unityRepoName,
      branch: unityBranch,
      payload: {
        project_id: projectId,
        build_job_id: insertedJob.id,
        app_name: appName,
        package_name: packageName,
        version_code: versionCode,
        version_name: versionName,
        target_platform: 'android'
      }
    });

    configWrite = writtenConfig;
    console.info('Koschei Unity build config written', {
      package_name: packageName,
      build_job_id: insertedJob.id
    });

    await serviceRole
      .from('unity_build_jobs')
      .update({
        branch: writtenConfig.branch,
        commit_sha: writtenConfig.commitSha,
        metadata: {
          githubConfigPath: writtenConfig.path,
          configCommitSha: writtenConfig.commitSha,
          configBranch: writtenConfig.branch
        }
      })
      .eq('id', insertedJob.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unity build config yazma hatası.';
    console.error('Koschei Unity build config write failed', {
      package_name: packageName,
      build_job_id: insertedJob.id,
      error: message
    });

    await serviceRole
      .from('unity_build_jobs')
      .update({
        status: 'failed',
        error_message: `Unity build config yazılamadı: ${message}`,
        metadata: {
          buildConfigWritten: false
        }
      })
      .eq('id', insertedJob.id);

    await serviceRole
      .from('unity_game_projects')
      .update({ status: 'failed' })
      .eq('id', projectId)
      .eq('workspace_id', context.workspaceId)
      .eq('user_id', context.userId);

    return json({ ok: false, error: `Unity build config yazılamadı: ${message}` }, 500);
  }

  let unityResponse: Awaited<ReturnType<typeof triggerBuild>>;
  let recoveredBuild: Awaited<ReturnType<typeof getBuilds>>[number] | null = null;

  try {
    unityResponse = await triggerBuild(buildTargetId);
  } catch (error) {
    const unityError = error instanceof UnityApiError ? error : new UnityApiError('Unity build tetikleme hatası.');

    await serviceRole.from('unity_build_jobs').update({
      status: 'failed',
      error_message: unityError.message
    }).eq('id', insertedJob.id);

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

  const { error: jobError } = await serviceRole
    .from('unity_build_jobs')
    .update({
      status: initialJobStatus,
      metadata: {
        ...(configWrite
          ? {
              githubConfigPath: configWrite.path,
              configCommitSha: configWrite.commitSha,
              configBranch: configWrite.branch
            }
          : {}),
        buildConfigWritten: true,
        ...(unityBuildNumber ? { unityBuildNumber } : {}),
        unityBuildTargetId: buildTargetId,
        unityReturnedBuildTargetId: unityResponse.buildTargetId,
        unityStatus: effectiveUnityStatus,
        unityDownloadUrl: effectiveDownloadUrl,
        needsUnityBuildNumberRecovery: !unityBuildNumber
      }
    })
    .eq('id', insertedJob.id);

  if (jobError) {
    return json({ ok: false, error: jobError?.message ?? 'Build kaydı oluşturulamadı.' }, 400);
  }

  await serviceRole.from('unity_game_projects').update({ status: 'building' }).eq('id', projectId);
  return json({ ok: true, jobId: insertedJob.id, unityBuildNumber: unityBuildNumber ?? null });
}

import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { requireActiveGameAgentPackage } from '@/lib/game-agent-access';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';
import { getBuilds, triggerBuild, UnityApiError } from '@/lib/server/unity-cloud-build';

const KOSCHEI_CONFIG_PATH = 'Assets/Koschei/Generated/koschei-build-config.json';

function encodeBase64(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64');
}

function safeVersionCode(input: unknown): number {
  if (typeof input === 'number' && Number.isInteger(input) && input > 0) return input;
  const ts = Math.floor(Date.now() / 1000);
  return ts > 0 ? ts : 1;
}

async function writeAndVerifyKoscheiBuildConfig(input: {
  project: Record<string, unknown>;
  buildJobId: string;
  versionCode: number;
}) {
  const owner = process.env.GITHUB_UNITY_REPO_OWNER?.trim();
  const repo = process.env.GITHUB_UNITY_REPO_NAME?.trim();
  const branch = process.env.GITHUB_UNITY_REPO_BRANCH?.trim() || 'main';
  const token = process.env.GITHUB_UNITY_REPO_TOKEN?.trim();
  if (!owner || !repo || !token) throw new Error('missing_unity_repo_env');

  const brief = ((input.project.game_brief as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  const appName = String(input.project.app_name ?? input.project.name ?? 'Koschei Game');
  const packageName = String(input.project.package_name ?? '').trim();
  if (!packageName) throw new Error('missing_package_name');

  const payload = {
    project_id: String(input.project.id ?? ''),
    build_job_id: input.buildJobId,
    app_name: appName,
    package_name: packageName,
    version_name: `1.0.${input.versionCode}`,
    version_code: input.versionCode,
    game_type: String(brief.gameType ?? 'runner_2d') || 'runner_2d',
    short_description: String(brief.storeShortDescription ?? ''),
    visual_style: String(brief.visualStyle ?? ''),
    controls: String(brief.controls ?? ''),
    features: Array.isArray(brief.mechanics) ? brief.mechanics.map((item) => String(item)) : [],
    target_platform: 'android'
  };

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${KOSCHEI_CONFIG_PATH}`;
  const body = {
    message: `chore: update Koschei build config for ${input.buildJobId}`,
    content: encodeBase64(JSON.stringify(payload, null, 2) + '\n'),
    branch
  };

  const writeResponse = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!writeResponse.ok) {
    const details = await writeResponse.text().catch(() => '');
    throw new Error(`config_write_failed:${writeResponse.status}:${details.slice(0, 180)}`);
  }

  const writeJson = (await writeResponse.json().catch(() => null)) as
    | { commit?: { sha?: string }; content?: { path?: string } }
    | null;

  if (writeJson?.content?.path !== KOSCHEI_CONFIG_PATH) {
    throw new Error(`config_write_path_mismatch:${writeJson?.content?.path ?? 'unknown'}`);
  }

  const verifyResponse = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json'
    }
  });
  if (!verifyResponse.ok) {
    const details = await verifyResponse.text().catch(() => '');
    throw new Error(`config_verify_failed:${verifyResponse.status}:${details.slice(0, 180)}`);
  }

  const verifyJson = (await verifyResponse.json().catch(() => null)) as
    | { path?: string; content?: string; encoding?: string }
    | null;
  if (verifyJson?.path !== KOSCHEI_CONFIG_PATH) {
    throw new Error(`config_verify_path_mismatch:${verifyJson?.path ?? 'unknown'}`);
  }

  const decodedContent =
    verifyJson?.encoding === 'base64' && typeof verifyJson.content === 'string'
      ? Buffer.from(verifyJson.content.replace(/\n/g, ''), 'base64').toString('utf8')
      : '';

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = decodedContent ? (JSON.parse(decodedContent) as Record<string, unknown>) : null;
  } catch {
    parsed = null;
  }

  const requiredFields = [
    'project_id',
    'build_job_id',
    'app_name',
    'package_name',
    'version_name',
    'version_code',
    'game_type',
    'short_description',
    'visual_style',
    'controls',
    'features',
    'target_platform'
  ];

  const missingField = requiredFields.find((field) => !(field in (parsed ?? {})));
  if (missingField) {
    throw new Error(`config_verify_missing_field:${missingField}`);
  }

  return { branch, commitSha: writeJson?.commit?.sha ?? null, payload };
}

function isValidPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export async function POST(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  const payload = (await request.json().catch(() => null)) as { projectId?: string | null } | null;
  const projectId = String(payload?.projectId ?? '').trim();
  if (!projectId) return json({ ok: false, error: 'projectId zorunlu.' }, 400);

  const serviceRole = getSupabaseServiceRoleClient();
  const { data: project } = await serviceRole
    .from('unity_game_projects')
    .select('id, workspace_id, approval_status, app_name, name, package_name, game_brief')
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

  if (project.approval_status !== 'approved') return json({ ok: false, error: 'Proje onay bekliyor.' }, 403);

  const buildTargetId = process.env.UNITY_BUILD_TARGET_ID?.trim();
  if (!buildTargetId) return json({ ok: false, error: 'UNITY_BUILD_TARGET_ID eksik.' }, 500);

  const versionCode = safeVersionCode(Date.now());
  const { data: insertedJob, error: jobError } = await serviceRole
    .from('unity_build_jobs')
    .insert({
      unity_game_project_id: projectId,
      workspace_id: projectWorkspaceId,
      user_id: context.userId,
      requested_by: context.userId,
      build_target: 'android',
      build_type: 'release',
      status: 'queued',
      queued_at: new Date().toISOString(),
      metadata: {
        unityBuildTargetId: buildTargetId,
        koscheiConfigPath: KOSCHEI_CONFIG_PATH,
        koscheiConfigVersionCode: versionCode
      }
    })
    .select('id')
    .single();

  if (jobError || !insertedJob) {
    return json({ ok: false, error: jobError?.message ?? 'Build kaydı oluşturulamadı.' }, 400);
  }

  try {
    const result = await writeAndVerifyKoscheiBuildConfig({ project, buildJobId: insertedJob.id, versionCode });
    console.info('Koschei Unity build config written and verified', {
      package_name: result.payload.package_name,
      app_name: result.payload.app_name,
      build_job_id: insertedJob.id,
      branch: result.branch,
      commit_sha: result.commitSha
    });
  } catch (error) {
    await serviceRole
      .from('unity_build_jobs')
      .update({
        status: 'failed',
        error_message: 'Unity build config yazılamadı; build başlatılmadı.'
      })
      .eq('id', insertedJob.id);

    await serviceRole.from('unity_game_projects').update({ status: 'failed' }).eq('id', projectId);
    return json({ ok: false, error: 'Unity build config yazılamadı; build başlatılmadı.' }, 502);
  }

  let unityResponse: Awaited<ReturnType<typeof triggerBuild>>;
  let recoveredBuild: Awaited<ReturnType<typeof getBuilds>>[number] | null = null;

  try {
    unityResponse = await triggerBuild(buildTargetId);
  } catch (error) {
    const unityError = error instanceof UnityApiError ? error : new UnityApiError('Unity build tetikleme hatası.');

    await serviceRole
      .from('unity_build_jobs')
      .update({
        status: 'failed',
        error_message: unityError.message
      })
      .eq('id', insertedJob.id);

    await serviceRole
      .from('unity_game_projects')
      .update({ status: 'failed' })
      .eq('id', projectId)
      .eq('workspace_id', projectWorkspaceId);

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

  await serviceRole
    .from('unity_build_jobs')
    .update({
      status: initialJobStatus,
      metadata: {
        ...(unityBuildNumber ? { unityBuildNumber } : {}),
        unityBuildTargetId: buildTargetId,
        unityReturnedBuildTargetId: unityResponse.buildTargetId,
        unityStatus: effectiveUnityStatus,
        unityDownloadUrl: effectiveDownloadUrl,
        needsUnityBuildNumberRecovery: !unityBuildNumber,
        koscheiConfigPath: KOSCHEI_CONFIG_PATH,
        koscheiConfigVersionCode: versionCode
      }
    })
    .eq('id', insertedJob.id);

  await serviceRole.from('unity_game_projects').update({ status: 'building' }).eq('id', projectId);
  return json({ ok: true, jobId: insertedJob.id, unityBuildNumber: unityBuildNumber ?? null });
}

import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { encryptCredentials } from '@/lib/credentials-encryption';
import { requireActiveGameAgentPackage } from '@/lib/game-agent-access';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';
import { runLocalAndroidBuild, runLocalWebGLBuild } from '@/lib/server/local-build-engine';
import { randomBytes } from 'node:crypto';
import { enforceRateLimit, gameFactoryBuildSchema } from '@/lib/api-security';

type UnityPlatform = 'Android' | 'WebGL' | 'StandaloneWindows64';
type UnityBuildTarget = 'koschei-android' | 'koschei-webgl' | 'koschei-windows64';

const BUILD_TARGET_BY_PLATFORM: Record<UnityPlatform, UnityBuildTarget> = {
  Android: 'koschei-android',
  WebGL: 'koschei-webgl',
  StandaloneWindows64: 'koschei-windows64'
};

export async function POST(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  const packageGateResponse = await requireActiveGameAgentPackage(context.supabase, context.userId, context.workspaceId);
  if (packageGateResponse) return packageGateResponse;

  const limitResponse = enforceRateLimit(request, '/api/game-factory/build');
  if (limitResponse) return limitResponse;

  const payload = (await request.json().catch(() => null)) as {
    projectId?: string | null;
    project_id?: string | null;
    workspace_id?: string | null;
    user_id?: string | null;
    username?: string | null;
    gameName?: string | null;
  } | null;
  const parsed = gameFactoryBuildSchema.safeParse({
    projectId: payload?.projectId ?? payload?.project_id,
    username: payload?.username,
    gameName: payload?.gameName,
    workspace_id: payload?.workspace_id ?? undefined,
    user_id: payload?.user_id ?? undefined
  });
  if (!parsed.success) return json({ ok: false, error: 'Geçersiz istek gövdesi.' }, 400);
  const { projectId, username, gameName } = parsed.data;

  const normalizedWorkspaceId = String(payload?.workspace_id ?? context.workspaceId).trim();
  const normalizedUserId = String(payload?.user_id ?? context.userId).trim();

  if (normalizedWorkspaceId !== context.workspaceId || normalizedUserId !== context.userId) {
    return json({ ok: false, error: 'workspace_id veya user_id doğrulanamadı.' }, 403);
  }

  const serviceRole = getSupabaseServiceRoleClient();
  const { data: project } = await serviceRole
    .from('unity_game_projects')
    .select('id, approval_status')
    .eq('id', projectId)
    .eq('workspace_id', context.workspaceId)
    .eq('user_id', context.userId)
    .maybeSingle();

  if (!project) return json({ ok: false, error: 'Proje bulunamadı.' }, 404);
  if (project.approval_status !== 'approved') return json({ ok: false, error: 'Proje onay bekliyor.' }, 403);

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 40);
  const bundleId = `com.koschei.${slugify(username) || 'user'}.${slugify(gameName) || 'game'}`;
  const keystorePass = randomBytes(24).toString('hex');
  const keyAlias = randomBytes(12).toString('hex');
  const encryptedPayload = JSON.stringify(encryptCredentials(JSON.stringify({ keystorePass, keyAlias })));

  const { error: credentialInsertError } = await serviceRole.from('integration_credentials').insert({
    credential_type: 'android_keystore',
    provider: 'koschei_system',
    workspace_id: context.workspaceId,
    user_id: context.userId,
    encrypted_payload: encryptedPayload
  });
  if (credentialInsertError) return json({ ok: false, error: credentialInsertError.message }, 400);

  const { error: projectUpdateError } = await serviceRole
    .from('unity_game_projects')
    .update({ package_name: bundleId })
    .eq('id', projectId)
    .eq('workspace_id', context.workspaceId)
    .eq('user_id', context.userId);
  if (projectUpdateError) return json({ ok: false, error: projectUpdateError.message }, 400);

  const { data: latestBrief } = await serviceRole
    .from('game_briefs')
    .select('brief_json')
    .eq('unity_game_project_id', projectId)
    .eq('workspace_id', context.workspaceId)
    .eq('user_id', context.userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const briefJson = latestBrief?.brief_json as { target_platforms?: unknown } | null;
  const aiSelectedPlatforms = Array.isArray(briefJson?.target_platforms)
    ? briefJson.target_platforms.filter((item): item is UnityPlatform => (
      item === 'Android' || item === 'WebGL' || item === 'StandaloneWindows64'
    ))
    : [];
  const primaryPlatform: UnityPlatform = aiSelectedPlatforms[0] ?? 'Android';
  const selectedBuildTarget = BUILD_TARGET_BY_PLATFORM[primaryPlatform];

  console.info('[Koschei][Build] Selected build target from AI brief', {
    projectId,
    aiSelectedPlatforms,
    selectedBuildTarget
  });

  const queuedAt = new Date().toISOString();
  const { data: queuedJob, error: queuedJobError } = await serviceRole
    .from('unity_build_jobs')
    .insert({
      unity_game_project_id: projectId,
      workspace_id: context.workspaceId,
      user_id: context.userId,
      requested_by: context.userId,
      build_target: selectedBuildTarget,
      build_type: 'release',
      status: 'queued',
      queued_at: queuedAt,
      metadata: { bundleId, autoGeneratedKeystore: true }
    })
    .select('id')
    .single();
  if (queuedJobError || !queuedJob) return json({ ok: false, error: queuedJobError?.message ?? 'Build kaydı oluşturulamadı.' }, 400);

  const vaultPath = `vault/${context.workspaceId}/${context.userId}/${projectId}.keystore.enc`;

  await serviceRole
    .from('unity_build_jobs')
    .update({ status: 'queued', metadata: { bundleId, autoGeneratedKeystore: true, keystoreVaultPath: vaultPath } })
    .eq('id', queuedJob.id);

  const buildPromise = selectedBuildTarget === 'koschei-webgl'
    ? runLocalWebGLBuild({ projectId, jobId: queuedJob.id })
    : runLocalAndroidBuild({
      projectId,
      jobId: queuedJob.id,
      bundleId,
      keystoreVaultPath: vaultPath,
      keystorePass,
      keyAlias,
      keyPass: keystorePass
    });

  buildPromise.catch((error) => {
    console.error('[Koschei][LocalBuild] worker failed', error);
  });

  await serviceRole.from('unity_game_projects').update({ status: 'building' }).eq('id', projectId);
  return json({ ok: true, jobId: queuedJob.id, bundleId, engine: 'local-cli' });
}

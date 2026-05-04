import express, { type Request } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createUserClient, requireAuth, serviceRoleClient } from './auth.js';
import { loadEnv } from './env.js';
import { getBuildStatus, getBuilds, triggerBuild, UnityApiError, type UnityBuildResponse, type UnityBuildStatus } from './unity-bridge.js';
import { decryptCredentials, encryptCredentials, serializeEncryptedCredentials, tryParseEncryptedCredentials } from './credentials-encryption.js';
import { GooglePlayPublisherProvider, validateGooglePlayServiceAccount } from './google-play.js';

const env = loadEnv();
const app = express();
app.use(express.json({ limit: '2mb' }));

const REFRESHABLE_STATUSES = ['queued', 'claimed', 'running', 'succeeded', 'failed', 'cancelled', 'started', 'success', 'failure'];
const VALID_PAYMENT_STATUSES = ['approved', 'rejected', 'cancelled'] as const;
const PAID_PLAN_NAMES = new Set(['starter', 'pro', 'studio', 'enterprise']);

const REQUEST_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_IP = 20;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

async function enforceRateLimit(req: Request, res: express.Response, scope: string): Promise<boolean> {
  const ip = String(req.header('x-forwarded-for')?.split(',')[0]?.trim() || req.ip || 'unknown');
  const key = `${scope}:${ip}`;
  const now = Date.now();
  try {
    const windowStart = new Date(now - REQUEST_WINDOW_MS).toISOString();
    await serviceRoleClient.from('request_rate_logs').delete().lt('created_at', windowStart);
    const { error: insertError } = await serviceRoleClient.from('request_rate_logs').insert({ scope, ip_address: ip, created_at: new Date(now).toISOString() });
    if (!insertError) {
      const { count, error: countError } = await serviceRoleClient
        .from('request_rate_logs')
        .select('id', { count: 'exact', head: true })
        .eq('scope', scope)
        .eq('ip_address', ip)
        .gte('created_at', windowStart);
      if (!countError && (count ?? 0) > MAX_REQUESTS_PER_IP) {
        res.status(429).json({ ok: false, error: 'Too many requests.' });
        return false;
      }
      return true;
    }
  } catch {
    // fallback to in-memory limiter
  }

  const entry = rateBuckets.get(key);
  if (!entry || entry.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + REQUEST_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS_PER_IP) {
    res.status(429).json({ ok: false, error: 'Too many requests.' });
    return false;
  }
  entry.count += 1;
  return true;
}

async function isPlatformOwner(userId: string, userEmail: string | null): Promise<boolean> {
  const ownerUserId = process.env.OWNER_USER_ID?.trim();
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (ownerUserId && ownerUserId === userId) return true;
  if (ownerEmail && userEmail?.toLowerCase() === ownerEmail) return true;
  return false;
}

async function requireOwner(req: express.Request, res: express.Response) {
  const auth = await requireAuth(req, res);
  if (!auth) return null;
  if (!(await isPlatformOwner(auth.userId, auth.userEmail))) {
    res.status(403).json({ ok: false, error: 'Owner yetkisi gerekiyor.' });
    return null;
  }
  return auth;
}

async function hasActiveGameAgentPackage(userId: string, workspaceId: string): Promise<boolean> {
  const { data: subscription } = await serviceRoleClient
    .from('subscriptions')
    .select('status, plan_name')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const status = String(subscription?.status ?? '').toLowerCase();
  const planName = String(subscription?.plan_name ?? '').toLowerCase();
  return ['active', 'trialing', 'approved'].includes(status) && PAID_PLAN_NAMES.has(planName);
}

function normalizeLegacyStatus(status: string | null): string {
  if (!status) return 'queued';
  if (status === 'started') return 'running';
  if (status === 'success') return 'succeeded';
  if (status === 'failure') return 'failed';
  if (status === 'canceled') return 'cancelled';
  return status;
}

function mapUnityStatusToJobStatus(status: UnityBuildStatus): string | null {
  if (status === 'queued') return 'queued';
  if (status === 'sentToBuilder' || status === 'started' || status === 'restarted') return 'running';
  if (status === 'success') return 'succeeded';
  if (status === 'failure') return 'failed';
  if (status === 'canceled') return 'cancelled';
  return null;
}

function mapUnityStatusToProjectStatus(status: UnityBuildStatus): string | null {
  if (status === 'success') return 'build_succeeded';
  if (status === 'failure' || status === 'canceled') return 'build_failed';
  if (status === 'queued' || status === 'sentToBuilder' || status === 'started' || status === 'restarted') return 'building';
  return null;
}

function isValidPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/game-factory/generate', async (req, res) => {
  if (!(await enforceRateLimit(req, res, '/game-factory/generate'))) return;
  const auth = await requireAuth(req, res);
  if (!auth) return;
  const userClient = createUserClient(auth.accessToken);
  if (!(await hasActiveGameAgentPackage(auth.userId, auth.workspaceId))) {
    res.status(403).json({ ok: false, error: 'Bu işlem için aktif Game Agent paketi gerekir.' });
    return;
  }

  const prompt = String(req.body?.prompt ?? '').trim();
  if (!prompt) return void res.status(400).json({ ok: false, error: 'prompt zorunlu.' });

  const { data: project, error } = await userClient
    .from('unity_game_projects')
    .insert({
      workspace_id: auth.workspaceId,
      user_id: auth.userId,
      app_name: prompt.slice(0, 80),
      package_name: `com.koschei.${Date.now()}`,
      status: 'draft',
      metadata: { source: 'backend_generate', prompt }
    })
    .select('id, app_name, status, created_at')
    .single();

  if (error || !project) return void res.status(400).json({ ok: false, error: error?.message ?? 'Proje oluşturulamadı.' });
  res.json({ ok: true, project });
});

app.post('/game-factory/build', async (req, res) => {
  if (!(await enforceRateLimit(req, res, '/game-factory/build'))) return;
  const auth = await requireAuth(req, res);
  if (!auth) return;
  const userClient = createUserClient(auth.accessToken);
  if (!(await hasActiveGameAgentPackage(auth.userId, auth.workspaceId))) {
    res.status(403).json({ ok: false, error: 'Bu işlem için aktif Game Agent paketi gerekir.' });
    return;
  }

  const projectId = String(req.body?.projectId ?? '').trim();
  if (!projectId) return void res.status(400).json({ ok: false, error: 'projectId zorunlu.' });

  const { data: project } = await userClient
    .from('unity_game_projects')
    .select('id, approval_status')
    .eq('id', projectId)
    .eq('workspace_id', auth.workspaceId)
    .eq('user_id', auth.userId)
    .maybeSingle();

  if (!project) return void res.status(404).json({ ok: false, error: 'Proje bulunamadı.' });
  if (project.approval_status !== 'approved') return void res.status(403).json({ ok: false, error: 'Proje onay bekliyor.' });

  const buildTargetId = env.UNITY_BUILD_TARGET_ID;
  let unityResponse: Awaited<ReturnType<typeof triggerBuild>>;
  let recoveredBuild: Awaited<ReturnType<typeof getBuilds>>[number] | null = null;

  try {
    unityResponse = await triggerBuild(buildTargetId);
  } catch (error) {
    const unityError = error instanceof UnityApiError ? error : new UnityApiError('Unity build tetikleme hatası.');
    const queuedAt = new Date().toISOString();
    await serviceRoleClient.from('unity_build_jobs').insert({ unity_game_project_id: projectId, workspace_id: auth.workspaceId, user_id: auth.userId, requested_by: auth.userId, build_target: 'android', build_type: 'release', status: 'failed', queued_at: queuedAt, error_message: unityError.message });
    await userClient.from('unity_game_projects').update({ status: 'failed' }).eq('id', projectId).eq('workspace_id', auth.workspaceId).eq('user_id', auth.userId);
    return void res.status(502).json({ ok: false, error: 'Unity build başlatılamadı.' });
  }

  const hasValidUnityBuildNumber = typeof unityResponse.build === 'number' && Number.isInteger(unityResponse.build) && unityResponse.build > 0;
  if (!hasValidUnityBuildNumber) {
    try {
      const latestBuilds = await getBuilds(buildTargetId, 10);
      recoveredBuild = latestBuilds.find((build) => build.buildTargetId === buildTargetId) ?? latestBuilds[0] ?? null;
    } catch {
      recoveredBuild = null;
    }
  }

  const unityBuildNumber = hasValidUnityBuildNumber ? unityResponse.build : typeof recoveredBuild?.build === 'number' && recoveredBuild.build > 0 ? recoveredBuild.build : null;
  const effectiveUnityStatus = recoveredBuild?.status ?? unityResponse.status;
  const initialJobStatus = effectiveUnityStatus === 'sentToBuilder' || effectiveUnityStatus === 'started' || effectiveUnityStatus === 'restarted' ? 'running' : 'queued';
  const effectiveDownloadUrl = recoveredBuild?.links?.download_primary?.href ?? unityResponse.links?.download_primary?.href ?? null;

  const { data: insertedJob, error: jobError } = await serviceRoleClient
    .from('unity_build_jobs')
    .insert({ unity_game_project_id: projectId, workspace_id: auth.workspaceId, user_id: auth.userId, requested_by: auth.userId, build_target: 'android', build_type: 'release', status: initialJobStatus, queued_at: new Date().toISOString(), metadata: { ...(unityBuildNumber ? { unityBuildNumber } : {}), unityBuildTargetId: buildTargetId, unityReturnedBuildTargetId: unityResponse.buildTargetId, unityStatus: effectiveUnityStatus, unityDownloadUrl: effectiveDownloadUrl, needsUnityBuildNumberRecovery: !unityBuildNumber } })
    .select('id')
    .single();

  if (jobError || !insertedJob) return void res.status(400).json({ ok: false, error: jobError?.message ?? 'Build kaydı oluşturulamadı.' });
  await userClient.from('unity_game_projects').update({ status: 'building' }).eq('id', projectId);
  res.json({ ok: true, jobId: insertedJob.id, unityBuildNumber: unityBuildNumber ?? null });
});

app.post('/game-factory/builds/refresh', async (req, res) => {
  if (!(await enforceRateLimit(req, res, '/game-factory/builds/refresh'))) return;
  const auth = await requireAuth(req, res);
  if (!auth) return;
  const userClient = createUserClient(auth.accessToken);
  const projectId = String(req.body?.projectId ?? '').trim();
  if (!projectId) return void res.status(400).json({ ok: false, error: 'projectId zorunlu.' });

  const { data: project } = await userClient
    .from('unity_game_projects')
    .select('id, package_name')
    .eq('id', projectId)
    .eq('workspace_id', auth.workspaceId)
    .eq('user_id', auth.userId)
    .maybeSingle();

  if (!project) return void res.status(404).json({ ok: false, error: 'Proje bulunamadı.' });

  const { data: jobs, error: jobsError } = await serviceRoleClient
    .from('unity_build_jobs')
    .select('id, unity_game_project_id, status, created_at, queued_at, started_at, build_target_id, metadata, artifact_url, error_message, requested_by')
    .eq('unity_game_project_id', projectId)
    .eq('workspace_id', auth.workspaceId)
    .in('status', REFRESHABLE_STATUSES)
    .order('created_at', { ascending: false })
    .limit(20);

  if (jobsError) return void res.status(400).json({ ok: false, error: jobsError.message });

  const timeoutThreshold = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  await serviceRoleClient
    .from('unity_build_jobs')
    .update({ status: 'failed', error_message: 'Job timed out', finished_at: new Date().toISOString() })
    .eq('workspace_id', auth.workspaceId)
    .eq('unity_game_project_id', projectId)
    .in('status', ['queued', 'running'])
    .lt('created_at', timeoutThreshold);

  const jobsToRefresh = (jobs ?? []).filter((job) => {
    const normalized = normalizeLegacyStatus(job.status);
    const isTerminal = normalized === 'succeeded' || normalized === 'failed' || normalized === 'cancelled';
    const metadata = (job.metadata ?? {}) as Record<string, unknown>;
    return !isTerminal || !job.artifact_url || !isValidPositiveInt(metadata.unityBuildNumber);
  });

  const results: Array<Record<string, unknown>> = [];
  const errors: string[] = [];
  let updated = 0;
  let repaired = 0;

  for (const job of jobsToRefresh) {
    const metadata = { ...((job.metadata ?? {}) as Record<string, unknown>) };
    try {
      const metadataBuildTargetId = typeof metadata.unityBuildTargetId === 'string' ? metadata.unityBuildTargetId.trim() : '';
      const unityBuildTargetId = metadataBuildTargetId || env.UNITY_BUILD_TARGET_ID;
      let unityBuildNumber = isValidPositiveInt(metadata.unityBuildNumber) ? metadata.unityBuildNumber : null;
      let recoveredFromBuilds: UnityBuildResponse | null = null;

      if (!unityBuildNumber) {
        const latestBuilds = await getBuilds(unityBuildTargetId, 10);
        recoveredFromBuilds = latestBuilds[0] ?? null;
        if (recoveredFromBuilds && isValidPositiveInt(recoveredFromBuilds.build)) {
          unityBuildNumber = recoveredFromBuilds.build;
          metadata.unityBuildNumber = unityBuildNumber;
          repaired += 1;
        }
      }

      if (!unityBuildNumber) throw new Error('Geçerli unityBuildNumber bulunamadı.');

      const unity = await getBuildStatus(unityBuildTargetId, unityBuildNumber);
      const nowIso = new Date().toISOString();
      const unityDownloadUrl = unity.links?.download_primary?.href ?? recoveredFromBuilds?.links?.download_primary?.href ?? null;
      const patch: Record<string, unknown> = {
        status: mapUnityStatusToJobStatus(unity.status) ?? normalizeLegacyStatus(job.status),
        metadata: { ...metadata, unityStatus: unity.status, unityFinished: unity.finished ?? null, unityDownloadUrl, unityBuildNumber, unityBuildTargetId, needsUnityBuildNumberRecovery: false }
      };

      if (unity.status === 'success') {
        patch.status = 'succeeded'; patch.finished_at = unity.finished ?? nowIso; patch.artifact_url = unityDownloadUrl ?? job.artifact_url ?? null; patch.artifact_type = 'aab'; patch.error_message = null;
      } else if (unity.status === 'failure' || unity.status === 'canceled') {
        patch.status = unity.status === 'failure' ? 'failed' : 'cancelled'; patch.finished_at = unity.finished ?? nowIso;
      } else if (unity.status === 'sentToBuilder' || unity.status === 'started' || unity.status === 'restarted') {
        patch.status = 'running'; patch.started_at = job.started_at ?? nowIso; patch.finished_at = null;
      }

      await serviceRoleClient.from('unity_build_jobs').update(patch).eq('id', job.id);

      const projectStatus = mapUnityStatusToProjectStatus(unity.status);
      if (projectStatus) {
        await userClient.from('unity_game_projects').update({ status: projectStatus }).eq('id', job.unity_game_project_id).eq('workspace_id', auth.workspaceId).eq('user_id', auth.userId);
      }

      if ((patch.status === 'succeeded' || unity.status === 'success') && unityDownloadUrl) {
        await serviceRoleClient.from('game_artifacts').upsert({
          unity_game_project_id: job.unity_game_project_id,
          unity_build_job_id: job.id,
          workspace_id: auth.workspaceId,
          user_id: job.requested_by ?? auth.userId,
          artifact_type: 'aab',
          file_url: unityDownloadUrl,
          file_name: `${project.package_name || 'game'}.aab`,
          file_size_bytes: null,
          status: 'ready'
        }, { onConflict: 'unity_build_job_id,artifact_type' });
      }

      updated += 1;
      results.push({ jobId: job.id, previousStatus: job.status, unityStatus: unity.status, newStatus: String(patch.status), repairedBuildNumber: unityBuildNumber, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Build durumu alınamadı.';
      errors.push(`Job ${job.id}: ${message}`);
      results.push({ jobId: job.id, previousStatus: job.status, ok: false, error: message });
    }
  }

  if (jobsToRefresh.length > 0 && updated === 0 && errors.length > 0) {
    return void res.status(500).json({ ok: false, updated, repaired, results, errors, error: 'Hiçbir build kaydı yenilenemedi.' });
  }

  res.json({ ok: true, updated, repaired, results, errors });
});

app.get('/game-factory/build-status', async (req, res) => {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  const jobId = String(req.query.jobId ?? '').trim();
  if (!jobId) return void res.status(400).json({ ok: false, error: 'jobId zorunlu.' });

  const { data: job } = await serviceRoleClient
    .from('unity_build_jobs')
    .select('id, unity_game_project_id, metadata, workspace_id, requested_by')
    .eq('id', jobId)
    .eq('workspace_id', auth.workspaceId)
    .maybeSingle();

  if (!job) return void res.status(404).json({ ok: false, error: 'Build işi bulunamadı.' });

  const buildNumber = (job.metadata as { unityBuildNumber?: number } | null)?.unityBuildNumber;
  const unityBuildTargetId = (job.metadata as { unityBuildTargetId?: string } | null)?.unityBuildTargetId;
  if (!isValidPositiveInt(buildNumber) || !unityBuildTargetId?.trim()) return void res.status(400).json({ ok: false, error: 'Unity build bilgisi eksik.' });

  const unityStatus = await getBuildStatus(unityBuildTargetId, buildNumber);
  const mappedStatus = mapUnityStatusToJobStatus(unityStatus.status);
  const projectStatus = mapUnityStatusToProjectStatus(unityStatus.status);
  const artifactUrl = unityStatus.links?.download_primary?.href ?? null;

  if (mappedStatus) {
    const patch: Record<string, unknown> = { status: mappedStatus };
    if (unityStatus.status === 'success') { patch.status = 'succeeded'; patch.artifact_url = artifactUrl; patch.finished_at = unityStatus.finished ?? new Date().toISOString(); patch.artifact_type = 'aab'; patch.error_message = null; }
    else if (unityStatus.status === 'failure') { patch.status = 'failed'; patch.finished_at = unityStatus.finished ?? new Date().toISOString(); }
    else if (unityStatus.status === 'canceled') { patch.status = 'cancelled'; patch.finished_at = unityStatus.finished ?? new Date().toISOString(); }
    else { patch.finished_at = null; }
    await serviceRoleClient.from('unity_build_jobs').update(patch).eq('id', jobId);
  }

  if ((mappedStatus === 'succeeded' || unityStatus.status === 'success') && artifactUrl) {
    await serviceRoleClient.from('game_artifacts').upsert({
      unity_game_project_id: job.unity_game_project_id,
      unity_build_job_id: job.id,
      workspace_id: job.workspace_id,
      user_id: job.requested_by ?? auth.userId,
      artifact_type: 'aab',
      file_url: artifactUrl,
      status: 'ready'
    }, { onConflict: 'unity_build_job_id,artifact_type' });
  }

  if (projectStatus) await serviceRoleClient.from('unity_game_projects').update({ status: projectStatus }).eq('id', job.unity_game_project_id);
  res.json({ ok: true, status: mappedStatus ?? 'unknown', artifactUrl, logs: null });
});

function readRawBody(req: Request): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
  });
}

app.post('/unity-build-callback', express.text({ type: '*/*' }), async (req, res) => {
  const rawBody = typeof req.body === 'string' ? req.body : await readRawBody(req);
  const secret = env.UNITY_WEBHOOK_SECRET;
  const signature = req.header('x-unity-signature') ?? req.header('x-signature') ?? '';

  if (secret && signature) {
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const provided = signature.replace(/^sha256=/, '');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const providedBuffer = Buffer.from(provided, 'hex');
    if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
      return void res.status(401).json({ ok: false, error: 'Invalid webhook signature.' });
    }
  } else if (secret) {
    return void res.status(401).json({ ok: false, error: 'Missing webhook signature.' });
  }

  const body = JSON.parse(rawBody || '{}') as Record<string, unknown>;
  const buildNumber = Number((body.buildNumber as number | undefined) ?? ((body.build as { buildNumber?: number } | undefined)?.buildNumber ?? 0));
  const status = String((body.buildStatus as string | undefined) ?? (body.status as string | undefined) ?? '').toLowerCase();
  const links = (body.links ?? {}) as { share_url?: { href?: string }; artifacts?: Array<{ files?: Array<{ href?: string }> }> };
  const downloadUrl = links.share_url?.href ?? links.artifacts?.[0]?.files?.[0]?.href ?? null;

  if (buildNumber > 0 && (status.includes('success') || status.includes('succeeded'))) {
    const { data: jobs } = await serviceRoleClient.from('unity_build_jobs').select('id,unity_game_project_id,workspace_id,requested_by').contains('metadata', { unityBuildNumber: buildNumber });
    await serviceRoleClient
      .from('unity_build_jobs')
      .update({ status: 'succeeded', artifact_url: downloadUrl, finished_at: new Date().toISOString(), artifact_type: 'aab' })
      .contains('metadata', { unityBuildNumber: buildNumber });
    for (const job of jobs ?? []) {
      if (downloadUrl) {
        await serviceRoleClient.from('game_artifacts').upsert({ unity_game_project_id: job.unity_game_project_id, unity_build_job_id: job.id, workspace_id: job.workspace_id, user_id: job.requested_by, artifact_type: 'aab', file_url: downloadUrl, status: 'ready' }, { onConflict: 'unity_build_job_id,artifact_type' });
      }
    }
  }

  res.status(200).json({ ok: true });
});

app.post('/integrations/google-play', async (req, res) => {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  const displayName = String(req.body?.displayName ?? '').trim();
  const defaultTrack = ['production', 'closed', 'internal'].includes(String(req.body?.defaultTrack ?? '')) ? String(req.body.defaultTrack) : 'production';
  const serviceAccountJson = String(req.body?.serviceAccountJson ?? '').trim();
  if (!displayName || !serviceAccountJson) return void res.status(400).json({ ok: false, error: 'Bağlantı adı ve service account JSON zorunludur.' });

  const parsed = JSON.parse(serviceAccountJson) as Record<string, unknown>;
  const clientEmail = typeof parsed.client_email === 'string' ? parsed.client_email.trim() : '';
  if (!clientEmail) return void res.status(400).json({ ok: false, error: 'client_email eksik.' });

  const validation = await validateGooglePlayServiceAccount(serviceAccountJson);
  const encryptedPayload = serializeEncryptedCredentials(encryptCredentials(JSON.stringify(parsed)));

  const { data: integration, error: integrationError } = await serviceRoleClient.from('user_integrations').insert({
    user_id: auth.userId,
    workspace_id: auth.workspaceId,
    provider: 'google_play',
    display_name: displayName,
    metadata: { connected_via: 'backend', has_service_account: true },
    provider_account_id: clientEmail,
    service_account_email: clientEmail,
    default_track: defaultTrack,
    status: validation.status,
    last_validated_at: new Date().toISOString(),
    error_message: validation.errorMessage
  }).select('id').single();

  if (integrationError || !integration) return void res.status(400).json({ ok: false, error: `Google Play bağlantısı kaydedilemedi: ${integrationError?.message}` });

  const { error: credentialsError } = await serviceRoleClient.from('integration_credentials').insert({
    workspace_id: auth.workspaceId,
    user_id: auth.userId,
    user_integration_id: integration.id,
    provider: 'google_play',
    credential_type: 'service_account_json',
    encrypted_payload: encryptedPayload,
    status: 'active',
    metadata: { display_name: displayName }
  });

  if (credentialsError) return void res.status(400).json({ ok: false, error: `Credential kaydı eklenemedi: ${credentialsError.message}` });
  res.json({ ok: true, status: validation.status });
});

app.post('/game-factory/release/publish', async (req, res) => {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  const projectId = String(req.body?.projectId ?? '').trim();
  if (!projectId) return void res.status(400).json({ ok: false, error: 'projectId zorunlu.' });

  const { data: unityProject } = await serviceRoleClient
    .from('unity_game_projects')
    .select('id, user_id, package_name, project_id')
    .eq('id', projectId)
    .eq('user_id', auth.userId)
    .maybeSingle();

  if (!unityProject?.package_name) return void res.status(400).json({ ok: false, error: 'Google Play paket adı eksik.' });

  const { data: gameProject } = unityProject.project_id
    ? await serviceRoleClient.from('game_projects').select('id, release_track, google_play_integration_id, current_version_code, current_version_name').eq('id', unityProject.project_id).maybeSingle()
    : { data: null as any };

  const [{ data: artifact }, { data: latestReleaseJob }] = await Promise.all([
    serviceRoleClient.from('game_artifacts').select('file_url').eq('unity_game_project_id', projectId).eq('artifact_type', 'aab').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    serviceRoleClient.from('game_release_jobs').select('id, status, release_notes, track').eq('unity_game_project_id', projectId).order('created_at', { ascending: false }).limit(1).maybeSingle()
  ]);
  if (!artifact?.file_url) return void res.status(400).json({ ok: false, error: 'Yayın için AAB dosyası bulunamadı.' });

  const { data: integration } = await serviceRoleClient
    .from('user_integrations')
    .select('id, default_track, status')
    .eq('id', gameProject?.google_play_integration_id)
    .eq('user_id', auth.userId)
    .eq('provider', 'google_play')
    .maybeSingle();

  if (!integration) return void res.status(400).json({ ok: false, error: 'Google Play bağlantısı bulunamadı.' });

  const { data: credentialsRow } = await serviceRoleClient
    .from('integration_credentials')
    .select('encrypted_payload')
    .eq('user_integration_id', integration.id)
    .eq('provider', 'google_play')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const encrypted = tryParseEncryptedCredentials(credentialsRow?.encrypted_payload ?? null);
  if (!encrypted) return void res.status(400).json({ ok: false, error: 'Google Play kimlik bilgileri çözümlenemedi.' });

  const provider = new GooglePlayPublisherProvider();
  const publishResult = await provider.publishRelease({ packageName: unityProject.package_name, track: latestReleaseJob?.track ?? integration.default_track ?? gameProject?.release_track ?? 'production', releaseNotes: latestReleaseJob?.release_notes ?? 'Game Factory yayın güncellemesi', aabFileUrl: artifact.file_url, serviceAccountJson: decryptCredentials(encrypted), versionCode: gameProject?.current_version_code ?? undefined, versionName: gameProject?.current_version_name ?? undefined });

  const status = publishResult.status === 'published' ? 'published' : publishResult.status;
  await serviceRoleClient.from('game_release_jobs').insert({ unity_game_project_id: projectId, status, track: latestReleaseJob?.track ?? integration.default_track ?? gameProject?.release_track ?? 'production', release_notes: latestReleaseJob?.release_notes ?? '', error_message: publishResult.errorMessage ?? null, workspace_id: auth.workspaceId, user_id: auth.userId });

  if (publishResult.status !== 'published') return void res.status(400).json({ ok: false, error: publishResult.errorMessage ?? 'Google Play yayını başarısız oldu.' });
  res.json({ ok: true });
});

app.get('/owner/summary', async (req, res) => {
  const owner = await requireOwner(req, res);
  if (!owner) return;
  const [usersRes, activeSubRes, pendingOrdersRes, approvedOrdersRes, failedBuildsRes, projectsRes, errorsRes] = await Promise.all([
    serviceRoleClient.from('profiles').select('id', { count: 'exact', head: true }),
    serviceRoleClient.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    serviceRoleClient.from('payment_orders').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('provider', 'shopier'),
    serviceRoleClient.from('payment_orders').select('id', { count: 'exact', head: true }).eq('status', 'approved').eq('provider', 'shopier'),
    serviceRoleClient.from('unity_build_jobs').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    serviceRoleClient.from('unity_game_projects').select('id, app_name, status, created_at').order('created_at', { ascending: false }).limit(5),
    serviceRoleClient.from('billing_events').select('id, event_type, payload, created_at').order('created_at', { ascending: false }).limit(5)
  ]);

  res.json({ ok: true, summary: { users: usersRes.count ?? 0, activeSubscriptions: activeSubRes.count ?? 0, pendingOrders: pendingOrdersRes.count ?? 0, approvedOrders: approvedOrdersRes.count ?? 0, failedBuilds: failedBuildsRes.count ?? 0 }, projects: projectsRes.data ?? [], events: errorsRes.data ?? [] });
});

app.get('/owner/users', async (req, res) => {
  const owner = await requireOwner(req, res);
  if (!owner) return;
  const { data, error } = await serviceRoleClient.from('profiles').select('id, email, created_at').order('created_at', { ascending: false }).limit(50);
  if (error) return void res.status(400).json({ ok: false, error: error.message });
  res.json({ ok: true, users: data ?? [] });
});

app.get('/owner/payments', async (req, res) => {
  const owner = await requireOwner(req, res);
  if (!owner) return;
  const { data: paymentOrders, error } = await serviceRoleClient.from('payment_orders').select('id, user_id, plan_key, amount, currency, status, created_at, approved_at, metadata').eq('provider', 'shopier').order('created_at', { ascending: false }).limit(50);
  if (error) return void res.status(400).json({ ok: false, error: error.message });

  const userIds = [...new Set((paymentOrders ?? []).map((order) => order.user_id).filter(Boolean))] as string[];
  const { data: profiles } = userIds.length ? await serviceRoleClient.from('profiles').select('id, email').in('id', userIds) : { data: [] as { id: string; email: string | null }[] };
  const emailMap = Object.fromEntries((profiles ?? []).map((profile) => [profile.id, profile.email]));
  res.json({ ok: true, paymentOrders: paymentOrders ?? [], emailMap });
});

app.patch('/owner/payments', async (req, res) => {
  const owner = await requireOwner(req, res);
  if (!owner) return;

  const payload = (req.body ?? {}) as { orderId?: string; status?: string; note?: string };
  const orderId = payload.orderId?.trim();
  if (!orderId || !VALID_PAYMENT_STATUSES.includes((payload.status ?? '') as (typeof VALID_PAYMENT_STATUSES)[number])) {
    return void res.status(400).json({ ok: false, error: 'order_id_and_valid_status_required' });
  }

  const { data: order, error: orderError } = await serviceRoleClient
    .from('payment_orders')
    .select('id, user_id, plan_key, amount, currency, status, metadata')
    .eq('id', orderId)
    .eq('provider', 'shopier')
    .maybeSingle();

  if (orderError || !order) return void res.status(404).json({ ok: false, error: orderError?.message ?? 'payment_order_not_found' });

  const nowIso = new Date().toISOString();
  const note = payload.note?.trim() || null;
  const nextMetadata = { ...(typeof order.metadata === 'object' && order.metadata ? order.metadata : {}), owner_note: note, owner_status_updated_at: nowIso };

  const { error: updateError } = await serviceRoleClient
    .from('payment_orders')
    .update({ status: payload.status, approved_at: payload.status === 'approved' ? nowIso : null, approved_by: payload.status === 'approved' ? owner.userId : null, metadata: nextMetadata })
    .eq('id', orderId);

  if (updateError) return void res.status(400).json({ ok: false, error: updateError.message });
  res.json({ ok: true });
});

app.get('/owner/build-jobs', async (req, res) => {
  const owner = await requireOwner(req, res);
  if (!owner) return;
  const { data, error } = await serviceRoleClient.from('unity_build_jobs').select('id, unity_game_project_id, status, created_at, error_message').order('created_at', { ascending: false }).limit(50);
  if (error) return void res.status(400).json({ ok: false, error: error.message });
  res.json({ ok: true, jobs: data ?? [] });
});

app.get('/owner/release-jobs', async (req, res) => {
  const owner = await requireOwner(req, res);
  if (!owner) return;
  const { data, error } = await serviceRoleClient.from('billing_events').select('id, event_type, created_at, payload').ilike('event_type', '%release%').order('created_at', { ascending: false }).limit(30);
  if (error) return void res.status(400).json({ ok: false, error: error.message });
  res.json({ ok: true, jobs: data ?? [] });
});

app.get('/owner/integrations', async (req, res) => {
  const owner = await requireOwner(req, res);
  if (!owner) return;
  const [{ count: integrationCount }, { count: modelConfigCount }] = await Promise.all([
    serviceRoleClient.from('user_integrations_public').select('id', { count: 'exact', head: true }),
    serviceRoleClient.from('billing_events').select('id', { count: 'exact', head: true }).ilike('event_type', '%model%')
  ]);
  res.json({ ok: true, integrationCount: integrationCount ?? 0, modelConfigCount: modelConfigCount ?? 0 });
});

app.get('/owner/logs', async (req, res) => {
  const owner = await requireOwner(req, res);
  if (!owner) return;
  const { data, error } = await serviceRoleClient.from('billing_events').select('id, event_type, actor_user_id, created_at').order('created_at', { ascending: false }).limit(100);
  if (error) return void res.status(400).json({ ok: false, error: error.message });
  res.json({ ok: true, events: data ?? [] });
});

app.get('/owner/dashboard', async (req, res) => {
  const owner = await requireOwner(req, res);
  if (!owner) return;

  const [buildJobsRes, purchasesRes, profilesRes, subscriptionsRes, integrationsRes] = await Promise.all([
    serviceRoleClient.from('unity_build_jobs').select('id, user_id, unity_game_project_id, status, created_at, error_message').order('created_at', { ascending: false }).limit(20),
    serviceRoleClient.from('package_purchases').select('id, user_id, package_key, amount, currency, status, created_at').order('created_at', { ascending: false }).limit(50),
    serviceRoleClient.from('profiles').select('id, email, created_at').order('created_at', { ascending: false }).limit(100),
    serviceRoleClient.from('subscriptions').select('id, user_id, status, current_period_end, created_at').order('created_at', { ascending: false }).limit(200),
    serviceRoleClient.from('user_integrations').select('id, user_id, provider, status, error_message, updated_at').eq('provider', 'google_play').order('updated_at', { ascending: false }).limit(100)
  ]);

  if (buildJobsRes.error || purchasesRes.error || profilesRes.error || subscriptionsRes.error || integrationsRes.error) {
    return void res.status(400).json({
      ok: false,
      error: buildJobsRes.error?.message ?? purchasesRes.error?.message ?? profilesRes.error?.message ?? subscriptionsRes.error?.message ?? integrationsRes.error?.message ?? 'dashboard_query_failed'
    });
  }

  res.json({
    ok: true,
    buildJobs: buildJobsRes.data ?? [],
    packagePurchases: purchasesRes.data ?? [],
    profiles: profilesRes.data ?? [],
    subscriptions: subscriptionsRes.data ?? [],
    googlePlayIntegrations: integrationsRes.data ?? []
  });
});

app.patch('/owner/package-purchases/:purchaseId/approve', async (req, res) => {
  const owner = await requireOwner(req, res);
  if (!owner) return;

  const purchaseId = String(req.params.purchaseId ?? '').trim();
  if (!purchaseId) return void res.status(400).json({ ok: false, error: 'purchase_id_required' });

  const { data: purchase, error: purchaseError } = await serviceRoleClient
    .from('package_purchases')
    .select('id, user_id, package_key, package_name')
    .eq('id', purchaseId)
    .maybeSingle();
  if (purchaseError || !purchase) return void res.status(404).json({ ok: false, error: purchaseError?.message ?? 'purchase_not_found' });

  const nowIso = new Date().toISOString();
  const { error } = await serviceRoleClient
    .from('package_purchases')
    .update({ status: 'approved', approved_at: nowIso, approved_by: owner.userId })
    .eq('id', purchaseId);

  if (error) return void res.status(400).json({ ok: false, error: error.message });

  const planName = String(purchase.package_key ?? purchase.package_name ?? '').trim().toLowerCase();
  if (PAID_PLAN_NAMES.has(planName)) {
    const { data: membership } = await serviceRoleClient
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', purchase.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (membership?.workspace_id) {
      await serviceRoleClient.from('subscriptions').insert({
        workspace_id: membership.workspace_id,
        user_id: purchase.user_id,
        plan_name: planName,
        status: 'approved'
      });
      await serviceRoleClient.from('profiles').update({ active_package_name: planName }).eq('id', purchase.user_id);
    }
  }

  res.json({ ok: true });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`[backend] listening on :${port}`);
});

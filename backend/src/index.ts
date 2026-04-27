import express, { type Request } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { requireAuth, serviceRoleClient } from './auth.js';
import { loadEnv } from './env.js';
import { getBuildStatus, getBuilds, triggerBuild, UnityApiError, type UnityBuildResponse, type UnityBuildStatus } from './unity-bridge.js';
import { decryptCredentials, encryptCredentials, serializeEncryptedCredentials, tryParseEncryptedCredentials } from './credentials-encryption.js';
import { GooglePlayPublisherProvider, validateGooglePlayServiceAccount } from './google-play.js';

const env = loadEnv();
const app = express();
app.use(express.json({ limit: '2mb' }));

const REFRESHABLE_STATUSES = ['queued', 'claimed', 'running', 'succeeded', 'failed', 'cancelled', 'started', 'success', 'failure'];

async function hasActiveGameAgentPackage(userId: string, workspaceId: string): Promise<boolean> {
  const [{ data: subscription }, { data: approvedOrder }] = await Promise.all([
    serviceRoleClient
      .from('subscriptions')
      .select('status, plan_name')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    serviceRoleClient
      .from('payment_orders')
      .select('status')
      .eq('user_id', userId)
      .eq('provider', 'shopier')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  const status = String(subscription?.status ?? '').toLowerCase();
  const planName = String(subscription?.plan_name ?? '').toLowerCase();
  return (['active', 'trialing', 'approved'].includes(status) && planName !== 'free') || Boolean(approvedOrder);
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

app.post('/game-factory/build', async (req, res) => {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  if (!(await hasActiveGameAgentPackage(auth.userId, auth.workspaceId))) {
    res.status(403).json({ ok: false, error: 'Bu işlem için aktif Game Agent paketi gerekir.' });
    return;
  }

  const projectId = String(req.body?.projectId ?? '').trim();
  if (!projectId) return void res.status(400).json({ ok: false, error: 'projectId zorunlu.' });

  const { data: project } = await serviceRoleClient
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
    await serviceRoleClient.from('unity_build_jobs').insert({ unity_game_project_id: projectId, workspace_id: auth.workspaceId, requested_by: auth.userId, build_target: 'android', build_type: 'release', status: 'failed', queued_at: queuedAt, error_message: unityError.message });
    await serviceRoleClient.from('unity_game_projects').update({ status: 'failed' }).eq('id', projectId).eq('workspace_id', auth.workspaceId).eq('user_id', auth.userId);
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
    .insert({ unity_game_project_id: projectId, workspace_id: auth.workspaceId, requested_by: auth.userId, build_target: 'android', build_type: 'release', status: initialJobStatus, queued_at: new Date().toISOString(), metadata: { ...(unityBuildNumber ? { unityBuildNumber } : {}), unityBuildTargetId: buildTargetId, unityReturnedBuildTargetId: unityResponse.buildTargetId, unityStatus: effectiveUnityStatus, unityDownloadUrl: effectiveDownloadUrl, needsUnityBuildNumberRecovery: !unityBuildNumber } })
    .select('id')
    .single();

  if (jobError || !insertedJob) return void res.status(400).json({ ok: false, error: jobError?.message ?? 'Build kaydı oluşturulamadı.' });
  await serviceRoleClient.from('unity_game_projects').update({ status: 'building' }).eq('id', projectId);
  res.json({ ok: true, jobId: insertedJob.id, unityBuildNumber: unityBuildNumber ?? null });
});

app.post('/game-factory/builds/refresh', async (req, res) => {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  const projectId = String(req.body?.projectId ?? '').trim();
  if (!projectId) return void res.status(400).json({ ok: false, error: 'projectId zorunlu.' });

  const { data: project } = await serviceRoleClient
    .from('unity_game_projects')
    .select('id, package_name')
    .eq('id', projectId)
    .eq('workspace_id', auth.workspaceId)
    .eq('user_id', auth.userId)
    .maybeSingle();

  if (!project) return void res.status(404).json({ ok: false, error: 'Proje bulunamadı.' });

  const { data: jobs, error: jobsError } = await serviceRoleClient
    .from('unity_build_jobs')
    .select('id, unity_game_project_id, status, created_at, queued_at, started_at, build_target_id, metadata, artifact_url, error_message')
    .eq('unity_game_project_id', projectId)
    .eq('workspace_id', auth.workspaceId)
    .in('status', REFRESHABLE_STATUSES)
    .order('created_at', { ascending: false })
    .limit(20);

  if (jobsError) return void res.status(400).json({ ok: false, error: jobsError.message });

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
        await serviceRoleClient.from('unity_game_projects').update({ status: projectStatus }).eq('id', job.unity_game_project_id).eq('workspace_id', auth.workspaceId).eq('user_id', auth.userId);
      }

      if ((patch.status === 'succeeded' || unity.status === 'success') && unityDownloadUrl) {
        await serviceRoleClient.from('game_artifacts').upsert({ unity_game_project_id: job.unity_game_project_id, build_job_id: job.id, artifact_type: 'aab', file_url: unityDownloadUrl, file_name: `${project.package_name || 'game'}.aab`, file_size_bytes: null }, { onConflict: 'build_job_id,artifact_type' });
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
    .select('id, unity_game_project_id, metadata')
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
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) {
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
    await serviceRoleClient
      .from('unity_build_jobs')
      .update({ status: 'succeeded', artifact_url: downloadUrl, finished_at: new Date().toISOString(), artifact_type: 'aab' })
      .contains('metadata', { unityBuildNumber: buildNumber });
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
  const encryptedCredentials = serializeEncryptedCredentials(encryptCredentials(JSON.stringify(parsed)));

  const { error } = await serviceRoleClient.from('user_integrations').insert({
    user_id: auth.userId, provider: 'google_play', display_name: displayName, encrypted_credentials: encryptedCredentials,
    service_account_email: clientEmail, default_track: defaultTrack, status: validation.status, last_validated_at: new Date().toISOString(), error_message: validation.errorMessage
  });

  if (error) return void res.status(400).json({ ok: false, error: `Google Play bağlantısı kaydedilemedi: ${error.message}` });
  res.json({ ok: true, status: validation.status });
});

app.post('/game-factory/release/publish', async (req, res) => {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  const projectId = String(req.body?.projectId ?? '').trim();
  if (!projectId) return void res.status(400).json({ ok: false, error: 'projectId zorunlu.' });

  const { data: project } = await serviceRoleClient
    .from('unity_game_projects')
    .select('id, user_id, package_name, release_track, google_play_integration_id, current_version_code, current_version_name')
    .eq('id', projectId)
    .eq('user_id', auth.userId)
    .maybeSingle();

  if (!project?.package_name) return void res.status(400).json({ ok: false, error: 'Google Play paket adı eksik.' });

  const [{ data: artifact }, { data: latestReleaseJob }] = await Promise.all([
    serviceRoleClient.from('game_artifacts').select('file_url').eq('unity_game_project_id', projectId).eq('artifact_type', 'aab').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    serviceRoleClient.from('game_release_jobs').select('id, status, release_notes, track').eq('unity_game_project_id', projectId).order('created_at', { ascending: false }).limit(1).maybeSingle()
  ]);
  if (!artifact?.file_url) return void res.status(400).json({ ok: false, error: 'Yayın için AAB dosyası bulunamadı.' });

  const { data: integration } = await serviceRoleClient
    .from('user_integrations')
    .select('id, encrypted_credentials, default_track, status')
    .eq('id', project.google_play_integration_id)
    .eq('user_id', auth.userId)
    .eq('provider', 'google_play')
    .maybeSingle();

  if (!integration) return void res.status(400).json({ ok: false, error: 'Google Play bağlantısı bulunamadı.' });
  const encrypted = tryParseEncryptedCredentials(integration.encrypted_credentials);
  if (!encrypted) return void res.status(400).json({ ok: false, error: 'Google Play kimlik bilgileri çözümlenemedi.' });

  const provider = new GooglePlayPublisherProvider();
  const publishResult = await provider.publishRelease({ packageName: project.package_name, track: latestReleaseJob?.track ?? integration.default_track ?? project.release_track ?? 'production', releaseNotes: latestReleaseJob?.release_notes ?? 'Game Factory yayın güncellemesi', aabFileUrl: artifact.file_url, serviceAccountJson: decryptCredentials(encrypted), versionCode: project.current_version_code, versionName: project.current_version_name });

  const status = publishResult.status === 'published' ? 'published' : publishResult.status;
  await serviceRoleClient.from('game_release_jobs').insert({ unity_game_project_id: projectId, status, track: latestReleaseJob?.track ?? integration.default_track ?? project.release_track ?? 'production', release_notes: latestReleaseJob?.release_notes ?? '', error_message: publishResult.errorMessage ?? null });

  if (publishResult.status !== 'published') return void res.status(400).json({ ok: false, error: publishResult.errorMessage ?? 'Google Play yayını başarısız oldu.' });
  res.json({ ok: true });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`[backend] listening on :${port}`);
});

import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { getApiAuthContext, json } from '../../_auth';

const UNITY_BASE_URL = 'https://build-api.cloud.unity3d.com/api/v1';
const REFRESHABLE_STATUSES = ['queued', 'claimed', 'running', 'succeeded', 'failed', 'cancelled', 'started', 'success', 'failure'];

type UnityBuildStatus = 'queued' | 'sentToBuilder' | 'started' | 'restarted' | 'success' | 'failure' | 'canceled' | 'unknown';

type UnityBuildResponse = {
  build: number | null;
  buildTargetId: string;
  status: UnityBuildStatus;
  created: string;
  finished?: string;
  links?: {
    download_primary?: { href?: string };
    logs?: { href?: string };
    dashboard_url?: { href?: string };
  };
};

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

function normalizeStatus(value: unknown): UnityBuildStatus {
  if (typeof value !== 'string') return 'unknown';
  const validStatuses = ['queued', 'sentToBuilder', 'started', 'restarted', 'success', 'failure', 'canceled'];
  return validStatuses.includes(value) ? (value as UnityBuildStatus) : 'unknown';
}

async function unityRequest(path: string): Promise<unknown> {
  const orgId = process.env.UNITY_ORG_ID?.trim();
  const projectId = process.env.UNITY_PROJECT_ID?.trim();
  const apiKey = process.env.UNITY_BUILD_API_KEY?.trim();

  if (!orgId || !projectId || !apiKey) {
    throw new Error('Unity yapılandırması eksik. UNITY_BUILD_API_KEY / UNITY_ORG_ID / UNITY_PROJECT_ID gerekli.');
  }

  const response = await fetch(`${UNITY_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(`${orgId}:${apiKey}`, 'utf8').toString('base64')}`,
      'Content-Type': 'application/json'
    },
    cache: 'no-store'
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.toLowerCase().includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : (payload as { message?: string })?.message;
    throw new Error(message || `Unity API hatası: ${response.status}`);
  }

  return payload;
}

function mapUnityBuild(raw: any, fallbackBuildTargetId: string): UnityBuildResponse {
  return {
    build: typeof raw?.build === 'number' && Number.isInteger(raw.build) && raw.build > 0 ? raw.build : null,
    buildTargetId: typeof raw?.buildtargetid === 'string' ? raw.buildtargetid : fallbackBuildTargetId,
    status: normalizeStatus(raw?.status),
    created: typeof raw?.created === 'string' ? raw.created : new Date(0).toISOString(),
    finished: typeof raw?.finished === 'string' ? raw.finished : undefined,
    links: raw?.links
  };
}

async function getBuilds(buildTargetId: string, limit = 10): Promise<UnityBuildResponse[]> {
  const orgId = process.env.UNITY_ORG_ID?.trim();
  const projectId = process.env.UNITY_PROJECT_ID?.trim();
  if (!orgId || !projectId) throw new Error('Unity yapılandırması eksik.');
  const data = await unityRequest(`/orgs/${orgId}/projects/${projectId}/buildtargets/${buildTargetId}/builds?per_page=${limit}`);
  if (!Array.isArray(data)) return [];
  return data.map((item) => mapUnityBuild(item, buildTargetId));
}

async function getBuildStatus(buildTargetId: string, buildNumber: number): Promise<UnityBuildResponse> {
  const orgId = process.env.UNITY_ORG_ID?.trim();
  const projectId = process.env.UNITY_PROJECT_ID?.trim();
  if (!orgId || !projectId) throw new Error('Unity yapılandırması eksik.');
  const data = await unityRequest(`/orgs/${orgId}/projects/${projectId}/buildtargets/${buildTargetId}/builds/${buildNumber}`);
  return mapUnityBuild(data, buildTargetId);
}

export async function POST(request: Request) {
  const auth = await getApiAuthContext(request);
  if (auth instanceof Response) return auth;

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const unityBuildTargetIdFromEnv = process.env.UNITY_BUILD_TARGET_ID?.trim();

  if (!supabaseUrl || !serviceRoleKey || !unityBuildTargetIdFromEnv) {
    return json({ ok: false, error: 'Sunucu ayarları eksik.' }, 500);
  }

  const serviceRoleClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const body = await request.json().catch(() => ({}));
  const projectId = String(body?.projectId ?? '').trim();
  if (!projectId) return json({ ok: false, error: 'projectId zorunlu.' }, 400);

  const { data: project } = await serviceRoleClient
    .from('unity_game_projects')
    .select('id, package_name')
    .eq('id', projectId)
    .eq('workspace_id', auth.workspaceId)
    .eq('user_id', auth.userId)
    .maybeSingle();

  if (!project) return json({ ok: false, error: 'Proje bulunamadı.' }, 404);

  const { data: jobs, error: jobsError } = await serviceRoleClient
    .from('unity_build_jobs')
    .select('id, unity_game_project_id, status, created_at, queued_at, started_at, build_target_id, metadata, artifact_url, logs_url, error_message, requested_by')
    .eq('unity_game_project_id', projectId)
    .eq('workspace_id', auth.workspaceId)
    .in('status', REFRESHABLE_STATUSES)
    .order('created_at', { ascending: false })
    .limit(20);

  if (jobsError) return json({ ok: false, error: jobsError.message }, 400);

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
      const unityBuildTargetId = metadataBuildTargetId || unityBuildTargetIdFromEnv;
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
      const unityLogsUrl = unity.links?.logs?.href ?? unity.links?.dashboard_url?.href ?? null;

      const patch: Record<string, unknown> = {
        status: mapUnityStatusToJobStatus(unity.status) ?? normalizeLegacyStatus(job.status),
        metadata: {
          ...metadata,
          unityStatus: unity.status,
          unityFinished: unity.finished ?? null,
          unityDownloadUrl,
          unityLogsUrl,
          unityBuildNumber,
          unityBuildTargetId,
          needsUnityBuildNumberRecovery: false
        },
        logs_url: unityLogsUrl ?? job.logs_url ?? null
      };

      if (unity.status === 'success') {
        patch.status = 'succeeded';
        patch.finished_at = unity.finished ?? nowIso;
        patch.artifact_url = unityDownloadUrl ?? job.artifact_url ?? null;
        patch.artifact_type = 'aab';
        patch.error_message = null;
      } else if (unity.status === 'failure' || unity.status === 'canceled') {
        patch.status = unity.status === 'failure' ? 'failed' : 'cancelled';
        patch.finished_at = unity.finished ?? nowIso;
      } else if (unity.status === 'sentToBuilder' || unity.status === 'started' || unity.status === 'restarted') {
        patch.status = 'running';
        patch.started_at = job.started_at ?? nowIso;
        patch.finished_at = null;
      }

      await serviceRoleClient.from('unity_build_jobs').update(patch).eq('id', job.id);

      const projectStatus = mapUnityStatusToProjectStatus(unity.status);
      if (projectStatus) {
        await serviceRoleClient
          .from('unity_game_projects')
          .update({ status: projectStatus })
          .eq('id', job.unity_game_project_id)
          .eq('workspace_id', auth.workspaceId)
          .eq('user_id', auth.userId);
      }

      if ((patch.status === 'succeeded' || unity.status === 'success') && unityDownloadUrl) {
        await serviceRoleClient.from('game_artifacts').upsert(
          {
            unity_game_project_id: job.unity_game_project_id,
            unity_build_job_id: job.id,
            workspace_id: auth.workspaceId,
            user_id: job.requested_by ?? auth.userId,
            artifact_type: 'aab',
            file_url: unityDownloadUrl,
            file_name: `${project.package_name || 'game'}.aab`,
            file_size_bytes: null,
            status: 'ready'
          },
          { onConflict: 'unity_build_job_id,artifact_type' }
        );
      }

      updated += 1;
      results.push({
        jobId: job.id,
        previousStatus: job.status,
        unityStatus: unity.status,
        newStatus: String(patch.status),
        repairedBuildNumber: unityBuildNumber,
        ok: true
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Build durumu alınamadı.';
      errors.push(`Job ${job.id}: ${message}`);
      results.push({ jobId: job.id, previousStatus: job.status, ok: false, error: message });
    }
  }

  if (jobsToRefresh.length > 0 && updated === 0 && errors.length > 0) {
    return json({ ok: false, updated, repaired, results, errors, error: 'Hiçbir build kaydı yenilenemedi.' }, 500);
  }

  return json({ ok: true, updated, repaired, results, errors });
}

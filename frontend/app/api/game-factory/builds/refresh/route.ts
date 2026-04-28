import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

const UNITY_BASE_URL = 'https://build-api.cloud.unity3d.com/api/v1';

type JsonObject = Record<string, unknown>;

type UnityBuildApiResponse = {
  status?: string;
  build?: number;
  buildNumber?: number;
  links?: {
    download_primary?: { href?: string };
    download?: { href?: string };
    artifacts?: { href?: string };
    artifact?: { href?: string };
    log?: { href?: string };
  };
  artifacts?: Array<{
    url?: string;
    href?: string;
    download_url?: string;
    files?: Array<{ url?: string; href?: string }>;
  }>;
  download_url?: string;
  artifact_url?: string;
};

function getUnityAuthHeader(): string {
  const apiKey = process.env.UNITY_BUILD_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('UNITY_BUILD_API_KEY eksik.');
  }

  return `Basic ${Buffer.from(`${apiKey}:`, 'utf8').toString('base64')}`;
}

function normalizeJobStatus(status: string): string {
  const value = status.toLowerCase();
  if (value.includes('success')) return 'succeeded';
  if (value.includes('failure') || value.includes('fail')) return 'failed';
  if (value.includes('cancel')) return 'cancelled';
  if (value.includes('start') || value.includes('builder') || value.includes('queue') || value.includes('restart')) return 'running';
  return 'queued';
}

function pickString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function extractArtifactUrl(payload: UnityBuildApiResponse): string | null {
  return (
    pickString(payload.links?.download_primary?.href) ??
    pickString(payload.links?.download?.href) ??
    pickString(payload.links?.artifacts?.href) ??
    pickString(payload.links?.artifact?.href) ??
    pickString(payload.artifacts?.[0]?.url) ??
    pickString(payload.artifacts?.[0]?.href) ??
    pickString(payload.artifacts?.[0]?.download_url) ??
    pickString(payload.artifacts?.[0]?.files?.[0]?.url) ??
    pickString(payload.artifacts?.[0]?.files?.[0]?.href) ??
    pickString(payload.download_url) ??
    pickString(payload.artifact_url) ??
    null
  );
}

function extractLogsUrl(payload: UnityBuildApiResponse): string | null {
  return pickString(payload.links?.log?.href);
}

async function unityRequest(path: string): Promise<unknown> {
  const authHeader = getUnityAuthHeader();
  const response = await fetch(`${UNITY_BASE_URL}${path}`, {
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json'
    },
    cache: 'no-store'
  });

  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.toLowerCase().includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof body === 'string'
        ? body.slice(0, 300)
        : typeof (body as { message?: unknown })?.message === 'string'
          ? String((body as { message?: unknown }).message)
          : `Unity API hatası: ${response.status}`;
    throw new Error(message);
  }

  return body;
}

async function getUnityBuildData(orgId: string, projectId: string, buildTargetId: string, buildNumber: number) {
  const detailsPath = `/orgs/${orgId}/projects/${projectId}/buildtargets/${buildTargetId}/builds/${buildNumber}`;
  const detailsRaw = (await unityRequest(detailsPath)) as UnityBuildApiResponse;

  let artifactUrl = extractArtifactUrl(detailsRaw);
  let logsUrl = extractLogsUrl(detailsRaw);
  let unityResponseKeys = Object.keys(detailsRaw ?? {});

  if (!artifactUrl) {
    const historyPath = `/orgs/${orgId}/projects/${projectId}/buildtargets/${buildTargetId}/builds?per_page=25`;
    const historyRaw = await unityRequest(historyPath);
    const historyList = Array.isArray(historyRaw) ? (historyRaw as UnityBuildApiResponse[]) : [];
    const matched = historyList.find((item) => {
      const candidate = Number(item.build ?? item.buildNumber ?? 0);
      return Number.isInteger(candidate) && candidate === buildNumber;
    });

    if (matched) {
      artifactUrl = extractArtifactUrl(matched) ?? artifactUrl;
      logsUrl = extractLogsUrl(matched) ?? logsUrl;
      unityResponseKeys = Array.from(new Set([...unityResponseKeys, ...Object.keys(matched ?? {})]));
    }
  }

  return {
    unityStatus: pickString(detailsRaw.status) ?? 'unknown',
    unityBuildNumber: Number(detailsRaw.build ?? detailsRaw.buildNumber ?? buildNumber) || buildNumber,
    artifactUrl,
    logsUrl,
    unityResponseKeys
  };
}

export async function POST(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  const payload = (await request.json().catch(() => null)) as { projectId?: string | null } | null;
  const projectId = String(payload?.projectId ?? '').trim();

  const serviceRole = getSupabaseServiceRoleClient();
  const { data: jobs, error: jobsError } = await serviceRole
    .from('unity_build_jobs')
    .select('id, unity_game_project_id, workspace_id, user_id, requested_by, status, artifact_url, metadata')
    .eq('workspace_id', context.workspaceId)
    .eq('unity_game_project_id', projectId)
    .in('status', ['queued', 'claimed', 'running', 'started', 'success', 'failure', 'succeeded', 'failed', 'cancelled'])
    .order('created_at', { ascending: false })
    .limit(20);

  if (jobsError) return json({ ok: false, error: jobsError.message }, 400);
  if (!jobs?.length) return json({ ok: true, message: 'Aktif build yok', results: [] });

  const orgId = process.env.UNITY_ORG_ID?.trim();
  const unityProjectId = process.env.UNITY_PROJECT_ID?.trim();
  if (!orgId || !unityProjectId) {
    return json({ ok: false, error: 'UNITY_ORG_ID veya UNITY_PROJECT_ID eksik.' }, 500);
  }

  const results: Array<Record<string, unknown>> = [];
  const errors: string[] = [];

  for (const job of jobs) {
    const metadata = ((job.metadata ?? {}) as JsonObject) ?? {};
    const buildTargetId = pickString(metadata.unityBuildTargetId) ?? process.env.UNITY_BUILD_TARGET_ID?.trim() ?? 'android-aab-release';
    const buildNumber = Number(metadata.unityBuildNumber ?? 0);

    if (!buildTargetId || !Number.isInteger(buildNumber) || buildNumber <= 0) {
      errors.push(`Job ${job.id}: unityBuildTargetId veya unityBuildNumber eksik`);
      continue;
    }

    try {
      const unity = await getUnityBuildData(orgId, unityProjectId, buildTargetId, buildNumber);
      const mappedStatus = normalizeJobStatus(unity.unityStatus);
      const terminal = ['succeeded', 'failed', 'cancelled'].includes(mappedStatus);
      const nowIso = new Date().toISOString();

      const patch: JsonObject = {
        status: mappedStatus,
        artifact_url: unity.artifactUrl ?? job.artifact_url ?? null,
        artifact_type: unity.artifactUrl ? 'aab' : undefined,
        logs_url: unity.logsUrl,
        finished_at: terminal ? nowIso : null,
        metadata: {
          ...metadata,
          unityBuildNumber: unity.unityBuildNumber,
          artifactFound: Boolean(unity.artifactUrl),
          refreshedAt: nowIso,
          unityResponseKeys: unity.unityResponseKeys
        }
      };

      if (!unity.artifactUrl) {
        delete patch.artifact_type;
      }

      await serviceRole.from('unity_build_jobs').update(patch).eq('id', job.id);

      if (unity.artifactUrl) {
        const { data: project } = await serviceRole
          .from('unity_game_projects')
          .select('package_name')
          .eq('id', job.unity_game_project_id)
          .maybeSingle();

        await serviceRole.from('game_artifacts').upsert(
          {
            workspace_id: job.workspace_id,
            user_id: job.requested_by ?? job.user_id,
            unity_game_project_id: job.unity_game_project_id,
            unity_build_job_id: job.id,
            artifact_type: 'aab',
            file_url: unity.artifactUrl,
            file_name: `${project?.package_name || 'game'}.aab`,
            file_size_bytes: null,
            status: 'ready',
            metadata: {
              source: 'unity_cloud_build_refresh',
              unityBuildNumber: unity.unityBuildNumber
            }
          },
          { onConflict: 'unity_build_job_id,artifact_type' }
        );
      }

      console.log('[build-refresh]', {
        jobId: job.id,
        status: mappedStatus,
        unityBuildNumber: unity.unityBuildNumber,
        artifactFound: Boolean(unity.artifactUrl),
        logsFound: Boolean(unity.logsUrl),
        unityResponseKeys: unity.unityResponseKeys
      });

      results.push({
        jobId: job.id,
        status: mappedStatus,
        unityBuildNumber: unity.unityBuildNumber,
        artifactFound: Boolean(unity.artifactUrl),
        logsFound: Boolean(unity.logsUrl)
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
      errors.push(`Job ${job.id}: ${message}`);
      results.push({ jobId: job.id, ok: false, error: message });
    }
  }

  return json({ ok: errors.length === 0, results, errors }, errors.length === 0 ? 200 : 207);
}

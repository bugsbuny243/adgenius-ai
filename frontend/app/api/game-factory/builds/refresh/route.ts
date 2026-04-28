import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { getBuildStatus } from '@/lib/server/unity-cloud-build';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

type JsonObject = Record<string, unknown>;

type UnityBuildApiResponse = {
  status?: string;
  links?: {
    download_primary?: { href?: string };
    log?: { href?: string };
    artifacts?: Array<{ files?: Array<{ href?: string }> }>;
  };
};

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
  return pickString(payload.links?.download_primary?.href) ?? pickString(payload.links?.artifacts?.[0]?.files?.[0]?.href) ?? null;
}

function extractLogsUrl(payload: UnityBuildApiResponse): string | null {
  return pickString(payload.links?.log?.href);
}

async function getUnityBuildData(buildTargetId: string, buildNumber: number) {
  const detailsRaw = (await getBuildStatus(buildTargetId, buildNumber)) as UnityBuildApiResponse & { build?: number | null };

  return {
    unityStatus: pickString(detailsRaw.status) ?? 'unknown',
    unityBuildNumber: Number(detailsRaw.build ?? buildNumber) || buildNumber,
    artifactUrl: extractArtifactUrl(detailsRaw),
    logsUrl: extractLogsUrl(detailsRaw),
    unityResponseKeys: Object.keys(detailsRaw ?? {})
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
      const unity = await getUnityBuildData(buildTargetId, buildNumber);
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

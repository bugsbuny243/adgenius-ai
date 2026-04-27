import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { getBuildStatus, getBuilds, type UnityBuildResponse, type UnityBuildStatus } from '@/lib/unity-bridge';

type RefreshRequest = {
  projectId: string;
};

type UnityBuildJobRow = {
  id: string;
  unity_game_project_id: string;
  status: string | null;
  created_at: string | null;
  queued_at: string | null;
  started_at: string | null;
  build_target_id: string | null;
  metadata: Record<string, unknown> | null;
  artifact_url: string | null;
  error_message: string | null;
};

const REFRESHABLE_STATUSES = ['queued', 'claimed', 'running', 'succeeded', 'failed', 'cancelled', 'started', 'success', 'failure'];

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

function shouldRefreshTerminalRow(job: UnityBuildJobRow): boolean {
  const metadata = (job.metadata ?? {}) as Record<string, unknown>;
  return !job.artifact_url || !isValidPositiveInt(metadata.unityBuildNumber);
}

function pickRecoveryBuild(job: UnityBuildJobRow, builds: UnityBuildResponse[]): UnityBuildResponse | null {
  const preferAfterIso = job.queued_at ?? job.created_at;
  if (!preferAfterIso) return builds[0] ?? null;

  const preferAfterTime = new Date(preferAfterIso).getTime();
  if (Number.isNaN(preferAfterTime)) return builds[0] ?? null;

  return builds.find((build) => new Date(build.created).getTime() >= preferAfterTime) ?? builds[0] ?? null;
}

export async function POST(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  const body = (await request.json()) as Partial<RefreshRequest>;
  const projectId = body.projectId?.trim();
  if (!projectId) return json({ ok: false, error: 'projectId zorunlu.' }, 400);

  const { data: project, error: projectError } = await context.supabase
    .from('unity_game_projects')
    .select('id, package_name')
    .eq('id', projectId)
    .eq('workspace_id', context.workspaceId)
    .eq('user_id', context.userId)
    .maybeSingle();

  if (projectError || !project) {
    return json({ ok: false, error: 'Proje bulunamadı.' }, 404);
  }

  const { data: jobs, error: jobsError } = await context.supabase
    .from('unity_build_jobs')
    .select('id, unity_game_project_id, status, created_at, queued_at, started_at, build_target_id, metadata, artifact_url, error_message')
    .eq('unity_game_project_id', projectId)
    .eq('workspace_id', context.workspaceId)
    .in('status', REFRESHABLE_STATUSES)
    .order('created_at', { ascending: false })
    .limit(20);

  if (jobsError) return json({ ok: false, error: jobsError.message }, 400);

  const jobsToRefresh = ((jobs ?? []) as UnityBuildJobRow[]).filter((job) => {
    const normalized = normalizeLegacyStatus(job.status);
    const isTerminal = normalized === 'succeeded' || normalized === 'failed' || normalized === 'cancelled';
    return !isTerminal || shouldRefreshTerminalRow(job);
  });

  const results: Array<{
    jobId: string;
    previousStatus: string | null;
    unityStatus?: UnityBuildStatus;
    newStatus?: string;
    repairedBuildNumber?: number;
    ok: boolean;
    error?: string;
  }> = [];
  const errors: string[] = [];
  let updated = 0;
  let repaired = 0;

  for (const job of jobsToRefresh) {
    const metadata = { ...((job.metadata ?? {}) as Record<string, unknown>) };
    const previousStatus = job.status;

    try {
      const metadataBuildTargetId = typeof metadata.unityBuildTargetId === 'string' ? metadata.unityBuildTargetId.trim() : '';
      const envBuildTargetId = process.env.UNITY_BUILD_TARGET_ID?.trim() ?? '';
      const unityBuildTargetId = metadataBuildTargetId || envBuildTargetId;

      if (!unityBuildTargetId) {
        throw new Error('Unity build target bilgisi eksik.');
      }

      let unityBuildNumber = isValidPositiveInt(metadata.unityBuildNumber) ? metadata.unityBuildNumber : null;
      let recoveredFromBuilds: UnityBuildResponse | null = null;

      if (!unityBuildNumber) {
        const latestBuilds = await getBuilds(unityBuildTargetId, 10);
        recoveredFromBuilds = pickRecoveryBuild(job, latestBuilds);
        if (recoveredFromBuilds && isValidPositiveInt(recoveredFromBuilds.build)) {
          unityBuildNumber = recoveredFromBuilds.build;
          metadata.unityBuildNumber = unityBuildNumber;
          metadata.needsUnityBuildNumberRecovery = false;
          repaired += 1;
        } else {
          metadata.needsUnityBuildNumberRecovery = true;
        }
      }

      if (!unityBuildNumber) {
        throw new Error('Geçerli unityBuildNumber bulunamadı ve recovery başarısız oldu.');
      }

      const unity = await getBuildStatus(unityBuildTargetId, unityBuildNumber);
      const nextStatus = mapUnityStatusToJobStatus(unity.status);
      const normalizedExistingStatus = normalizeLegacyStatus(job.status);
      const finalStatus = nextStatus ?? normalizedExistingStatus;
      const nowIso = new Date().toISOString();
      const unityDownloadUrl = unity.links?.download_primary?.href ?? recoveredFromBuilds?.links?.download_primary?.href ?? null;

      const patch: Record<string, unknown> = {
        status: finalStatus,
        metadata: {
          ...metadata,
          unityStatus: unity.status,
          unityFinished: unity.finished ?? null,
          unityDownloadUrl,
          unityBuildNumber,
          unityBuildTargetId,
          needsUnityBuildNumberRecovery: false
        }
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
        patch.error_message = job.error_message ?? `Unity build ${unity.status} durumu döndü.`;
      } else if (unity.status === 'queued') {
        patch.status = 'queued';
        patch.finished_at = null;
      } else if (unity.status === 'sentToBuilder' || unity.status === 'started' || unity.status === 'restarted') {
        patch.status = 'running';
        patch.started_at = job.started_at ?? nowIso;
        patch.finished_at = null;
      }

      const { error: updateError } = await context.supabase.from('unity_build_jobs').update(patch).eq('id', job.id);
      if (updateError) {
        throw new Error(updateError.message);
      }

      const projectStatus = mapUnityStatusToProjectStatus(unity.status);
      if (projectStatus) {
        const { error: projectStatusError } = await context.supabase
          .from('unity_game_projects')
          .update({ status: projectStatus })
          .eq('id', job.unity_game_project_id)
          .eq('workspace_id', context.workspaceId)
          .eq('user_id', context.userId);

        if (projectStatusError) {
          console.warn('[game-factory/builds/refresh] unity_game_projects status update skipped', {
            jobId: job.id,
            message: projectStatusError.message
          });
        }
      }

      if ((patch.status === 'succeeded' || unity.status === 'success') && unityDownloadUrl) {
        const artifactPayload = {
          unity_game_project_id: job.unity_game_project_id,
          build_job_id: job.id,
          artifact_type: 'aab',
          file_url: unityDownloadUrl,
          file_name: `${project.package_name || 'game'}.aab`,
          file_size_bytes: null
        };

        const { error: artifactError } = await context.supabase
          .from('game_artifacts')
          .upsert(artifactPayload, { onConflict: 'build_job_id,artifact_type' });

        if (artifactError) {
          console.warn('[game-factory/builds/refresh] game_artifacts upsert skipped', {
            jobId: job.id,
            message: artifactError.message
          });
        }
      }

      updated += 1;
      results.push({
        jobId: job.id,
        previousStatus,
        unityStatus: unity.status,
        newStatus: String(patch.status),
        repairedBuildNumber: unityBuildNumber,
        ok: true
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Build durumu alınamadı.';
      const safeError = `Job ${job.id}: ${message}`;
      errors.push(safeError);
      results.push({
        jobId: job.id,
        previousStatus,
        ok: false,
        error: message
      });
    }
  }

  if (jobsToRefresh.length > 0 && updated === 0 && errors.length > 0) {
    return json(
      {
        ok: false,
        updated,
        repaired,
        results,
        errors,
        error: 'Hiçbir build kaydı yenilenemedi.'
      },
      500
    );
  }

  return json({
    ok: true,
    updated,
    repaired,
    results,
    errors
  });
}

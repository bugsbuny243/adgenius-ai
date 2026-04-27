import 'server-only';

import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';
import { getBuildStatus, getBuilds, type UnityBuildResponse, type UnityBuildStatus } from '@/lib/server/unity-cloud-build';

type AuthContext = {
  userId: string;
  workspaceId: string;
};

type JsonObject = Record<string, unknown>;

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

function extractUnityLinks(unity: UnityBuildResponse) {
  const artifactUrl = unity.links?.download_primary?.href ?? unity.links?.share_url?.href ?? unity.links?.artifacts?.[0]?.files?.[0]?.href ?? null;
  const logsUrl = unity.links?.log?.href ?? null;
  return { artifactUrl, logsUrl };
}

async function upsertArtifact(args: {
  unityGameProjectId: string;
  jobId: string;
  workspaceId: string;
  userId: string;
  fileUrl: string;
  packageName?: string | null;
}) {
  const serviceRole = getSupabaseServiceRoleClient();
  await serviceRole.from('game_artifacts').upsert(
    {
      unity_game_project_id: args.unityGameProjectId,
      unity_build_job_id: args.jobId,
      workspace_id: args.workspaceId,
      user_id: args.userId,
      artifact_type: 'aab',
      file_url: args.fileUrl,
      file_name: `${args.packageName || 'game'}.aab`,
      status: 'ready'
    },
    { onConflict: 'unity_build_job_id,artifact_type' }
  );
}

export async function refreshSingleBuildStatus(auth: AuthContext, jobId: string) {
  const serviceRole = getSupabaseServiceRoleClient();
  const { data: job } = await serviceRole
    .from('unity_build_jobs')
    .select('id, unity_game_project_id, metadata, workspace_id, requested_by, status, started_at, artifact_url')
    .eq('id', jobId)
    .eq('workspace_id', auth.workspaceId)
    .maybeSingle();

  if (!job) {
    return { status: 404, body: { ok: false, error: 'Build işi bulunamadı.' } };
  }

  const metadata = { ...((job.metadata ?? {}) as JsonObject) };
  const unityBuildTargetId =
    typeof metadata.unityBuildTargetId === 'string' && metadata.unityBuildTargetId.trim()
      ? metadata.unityBuildTargetId.trim()
      : process.env.UNITY_BUILD_TARGET_ID?.trim() ?? '';
  const unityBuildNumber = isValidPositiveInt(metadata.unityBuildNumber) ? metadata.unityBuildNumber : null;

  if (!unityBuildTargetId || !unityBuildNumber) {
    return { status: 400, body: { ok: false, error: 'Unity build bilgisi eksik.' } };
  }

  const unity = await getBuildStatus(unityBuildTargetId, unityBuildNumber);
  const mappedStatus = mapUnityStatusToJobStatus(unity.status);
  const projectStatus = mapUnityStatusToProjectStatus(unity.status);
  const nowIso = new Date().toISOString();
  const { artifactUrl, logsUrl } = extractUnityLinks(unity);

  const patch: JsonObject = {
    status: mappedStatus ?? normalizeLegacyStatus(job.status),
    logs_url: logsUrl,
    metadata: { ...metadata, unityStatus: unity.status, unityFinished: unity.finished ?? null }
  };

  if (unity.status === 'success') {
    patch.status = 'succeeded';
    patch.artifact_url = artifactUrl ?? job.artifact_url ?? null;
    patch.finished_at = unity.finished ?? nowIso;
    patch.artifact_type = 'aab';
    patch.error_message = null;
  } else if (unity.status === 'failure' || unity.status === 'canceled') {
    patch.finished_at = unity.finished ?? nowIso;
    patch.status = unity.status === 'failure' ? 'failed' : 'cancelled';
  } else {
    patch.started_at = job.started_at ?? nowIso;
    patch.finished_at = null;
  }

  await serviceRole.from('unity_build_jobs').update(patch).eq('id', job.id);

  if (projectStatus) {
    await serviceRole.from('unity_game_projects').update({ status: projectStatus }).eq('id', job.unity_game_project_id);
  }

  if ((patch.status === 'succeeded' || unity.status === 'success') && artifactUrl) {
    const { data: project } = await serviceRole
      .from('unity_game_projects')
      .select('package_name')
      .eq('id', job.unity_game_project_id)
      .maybeSingle();

    await upsertArtifact({
      unityGameProjectId: job.unity_game_project_id,
      jobId: job.id,
      workspaceId: job.workspace_id,
      userId: job.requested_by ?? auth.userId,
      fileUrl: artifactUrl,
      packageName: project?.package_name
    });
  }

  return { status: 200, body: { ok: true, status: patch.status, artifactUrl, logs: logsUrl } };
}

export async function refreshProjectBuilds(auth: AuthContext, projectId: string) {
  const serviceRole = getSupabaseServiceRoleClient();

  const { data: project } = await serviceRole
    .from('unity_game_projects')
    .select('id, package_name')
    .eq('id', projectId)
    .eq('workspace_id', auth.workspaceId)
    .eq('user_id', auth.userId)
    .maybeSingle();

  if (!project) {
    return { status: 404, body: { ok: false, error: 'Proje bulunamadı.' } };
  }

  const { data: jobs, error: jobsError } = await serviceRole
    .from('unity_build_jobs')
    .select('id, unity_game_project_id, status, started_at, artifact_url, metadata, requested_by, workspace_id')
    .eq('unity_game_project_id', projectId)
    .eq('workspace_id', auth.workspaceId)
    .in('status', REFRESHABLE_STATUSES)
    .order('created_at', { ascending: false })
    .limit(20);

  if (jobsError) {
    return { status: 400, body: { ok: false, error: jobsError.message } };
  }

  const jobsToRefresh = (jobs ?? []).filter((job) => {
    const normalized = normalizeLegacyStatus(job.status);
    const terminal = normalized === 'succeeded' || normalized === 'failed' || normalized === 'cancelled';
    const metadata = (job.metadata ?? {}) as JsonObject;
    return !terminal || !job.artifact_url || !isValidPositiveInt(metadata.unityBuildNumber);
  });

  const results: Array<Record<string, unknown>> = [];
  const errors: string[] = [];
  let updated = 0;
  let repaired = 0;

  for (const job of jobsToRefresh) {
    const metadata = { ...((job.metadata ?? {}) as JsonObject) };

    try {
      const unityBuildTargetId =
        typeof metadata.unityBuildTargetId === 'string' && metadata.unityBuildTargetId.trim()
          ? metadata.unityBuildTargetId.trim()
          : process.env.UNITY_BUILD_TARGET_ID?.trim() ?? '';
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

      if (!unityBuildNumber || !unityBuildTargetId) {
        throw new Error('Geçerli unityBuildNumber bulunamadı.');
      }

      const unity = await getBuildStatus(unityBuildTargetId, unityBuildNumber);
      const nowIso = new Date().toISOString();
      const { artifactUrl, logsUrl } = extractUnityLinks(unity);

      const patch: JsonObject = {
        status: mapUnityStatusToJobStatus(unity.status) ?? normalizeLegacyStatus(job.status),
        logs_url: logsUrl,
        metadata: {
          ...metadata,
          unityStatus: unity.status,
          unityFinished: unity.finished ?? null,
          unityDownloadUrl: artifactUrl,
          unityBuildNumber,
          unityBuildTargetId,
          needsUnityBuildNumberRecovery: false
        }
      };

      if (unity.status === 'success') {
        patch.status = 'succeeded';
        patch.finished_at = unity.finished ?? nowIso;
        patch.artifact_url = artifactUrl ?? job.artifact_url ?? null;
        patch.artifact_type = 'aab';
        patch.error_message = null;
      } else if (unity.status === 'failure' || unity.status === 'canceled') {
        patch.status = unity.status === 'failure' ? 'failed' : 'cancelled';
        patch.finished_at = unity.finished ?? nowIso;
      } else {
        patch.status = 'running';
        patch.started_at = job.started_at ?? nowIso;
        patch.finished_at = null;
      }

      await serviceRole.from('unity_build_jobs').update(patch).eq('id', job.id);

      const projectStatus = mapUnityStatusToProjectStatus(unity.status);
      if (projectStatus) {
        await serviceRole.from('unity_game_projects').update({ status: projectStatus }).eq('id', job.unity_game_project_id);
      }

      if ((patch.status === 'succeeded' || unity.status === 'success') && artifactUrl) {
        await upsertArtifact({
          unityGameProjectId: job.unity_game_project_id,
          jobId: job.id,
          workspaceId: auth.workspaceId,
          userId: job.requested_by ?? auth.userId,
          fileUrl: artifactUrl,
          packageName: project.package_name
        });
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
    return {
      status: 500,
      body: { ok: false, updated, repaired, results, errors, error: 'Hiçbir build kaydı yenilenemedi.' }
    };
  }

  return { status: 200, body: { ok: true, updated, repaired, results, errors } };
}

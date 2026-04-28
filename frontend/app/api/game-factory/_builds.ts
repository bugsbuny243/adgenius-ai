import 'server-only';
import { getBuildStatus, getBuilds } from '@/lib/server/unity-cloud-build';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

interface ApiAuthContext {
  userId: string;
  workspaceId: string;
  supabase: ReturnType<typeof getSupabaseServiceRoleClient>;
}

function mapUnityStatus(unityStatus: string): string {
  switch (unityStatus) {
    case 'success': return 'success';
    case 'failure': case 'failed': return 'failed';
    case 'canceled': case 'cancelled': return 'cancelled';
    case 'queued': return 'queued';
    default: return 'running';
  }
}

export async function refreshSingleBuildStatus(
  context: ApiAuthContext,
  jobId: string
): Promise<{ body: object; status: number }> {
  const service = getSupabaseServiceRoleClient();

  const { data: job } = await service
    .from('unity_build_jobs')
    .select('id, status, metadata, unity_game_project_id, workspace_id')
    .eq('id', jobId)
    .eq('workspace_id', context.workspaceId)
    .maybeSingle();

  if (!job) return { body: { ok: false, error: 'Build kaydı bulunamadı.' }, status: 404 };

  // Zaten bitti mi?
  if (job.status === 'success' || job.status === 'failed' || job.status === 'cancelled') {
    return { body: { ok: true, status: job.status, artifactUrl: (job.metadata as Record<string, unknown>)?.artifactUrl ?? null }, status: 200 };
  }

  const meta = (job.metadata ?? {}) as Record<string, unknown>;
  const buildTargetId = process.env.UNITY_BUILD_TARGET_ID?.trim();
  if (!buildTargetId) return { body: { ok: false, error: 'UNITY_BUILD_TARGET_ID eksik.' }, status: 500 };

  let unityBuildNumber = typeof meta.unityBuildNumber === 'number' ? meta.unityBuildNumber : null;

  // Build number yoksa en son build'i bul
  if (!unityBuildNumber) {
    try {
      const builds = await getBuilds(buildTargetId, 5);
      const latest = builds[0];
      if (latest?.build) unityBuildNumber = latest.build;
    } catch {
      return { body: { ok: true, status: 'queued', artifactUrl: null }, status: 200 };
    }
  }

  if (!unityBuildNumber) {
    return { body: { ok: true, status: 'queued', artifactUrl: null }, status: 200 };
  }

  let unityData;
  try {
    unityData = await getBuildStatus(buildTargetId, unityBuildNumber);
  } catch {
    return { body: { ok: true, status: job.status, artifactUrl: null }, status: 200 };
  }

  const newStatus = mapUnityStatus(unityData.status);
  const artifactUrl = unityData.links?.download_primary?.href ?? null;

  await service.from('unity_build_jobs').update({
    status: newStatus,
    started_at: unityData.created ?? null,
    finished_at: unityData.finished ?? null,
    artifact_url: artifactUrl,
    artifact_type: artifactUrl ? 'aab' : null,
    metadata: {
      ...meta,
      unityBuildNumber,
      unityStatus: unityData.status,
      artifactUrl,
    },
  }).eq('id', jobId);

  if (newStatus === 'success') {
    await service.from('unity_game_projects')
      .update({ status: 'build_ready' })
      .eq('id', job.unity_game_project_id);
  } else if (newStatus === 'failed') {
    await service.from('unity_game_projects')
      .update({ status: 'failed' })
      .eq('id', job.unity_game_project_id);
  }

  return { body: { ok: true, status: newStatus, artifactUrl }, status: 200 };
}

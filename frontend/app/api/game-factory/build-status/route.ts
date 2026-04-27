import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { getBuildStatus, type UnityBuildStatus } from '@/lib/unity-bridge';

type JobRow = {
  id: string;
  unity_game_project_id: string;
  metadata: { unityBuildNumber?: number; unityBuildTargetId?: string } | null;
};

function mapUnityStatusToDbStatus(status: UnityBuildStatus): string | null {
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

export async function GET(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId')?.trim();

  if (!jobId) return json({ ok: false, error: 'jobId zorunlu.' }, 400);

  const { data: job, error: jobError } = await context.supabase
    .from('unity_build_jobs')
    .select('id, unity_game_project_id, metadata')
    .eq('id', jobId)
    .eq('workspace_id', context.workspaceId)
    .maybeSingle();

  if (jobError || !job) return json({ ok: false, error: 'Build işi bulunamadı.' }, 404);

  const typedJob = job as JobRow;
  const buildNumber = typedJob.metadata?.unityBuildNumber;
  const unityBuildTargetId = typedJob.metadata?.unityBuildTargetId;

  if (typeof buildNumber !== 'number' || typeof unityBuildTargetId !== 'string' || !unityBuildTargetId.trim()) {
    return json({ ok: false, error: 'Unity build bilgisi eksik.' }, 400);
  }

  const unityStatus = await getBuildStatus(unityBuildTargetId, buildNumber);
  const mappedStatus = mapUnityStatusToDbStatus(unityStatus.status);
  const projectStatus = mapUnityStatusToProjectStatus(unityStatus.status);
  const artifactUrl = unityStatus.links?.download_primary?.href ?? null;

  if (mappedStatus) {
    const patch: Record<string, unknown> = { status: mappedStatus };

    if (unityStatus.status === 'success') {
      patch.status = 'succeeded';
      patch.artifact_url = artifactUrl;
      patch.finished_at = unityStatus.finished ?? new Date().toISOString();
      patch.artifact_type = 'aab';
      patch.error_message = null;
    } else if (unityStatus.status === 'failure') {
      patch.status = 'failed';
      patch.finished_at = unityStatus.finished ?? new Date().toISOString();
    } else if (unityStatus.status === 'canceled') {
      patch.status = 'cancelled';
      patch.finished_at = unityStatus.finished ?? new Date().toISOString();
    } else {
      patch.finished_at = null;
    }

    await context.supabase.from('unity_build_jobs').update(patch).eq('id', jobId);
  }

  if (projectStatus) {
    await context.supabase.from('unity_game_projects').update({ status: projectStatus }).eq('id', typedJob.unity_game_project_id);
  }

  return json({ ok: true, status: mappedStatus ?? 'unknown', artifactUrl, logs: null });
}

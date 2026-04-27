import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { getBuildStatus, type UnityBuildStatus } from '@/lib/unity-bridge';

type RefreshRequest = { projectId: string };

type UnityBuildJobRow = {
  id: string;
  status: string | null;
  started_at: string | null;
  artifact_url: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
};

type RefreshError = {
  jobId: string;
  message: string;
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

export async function POST(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  const body = (await request.json()) as Partial<RefreshRequest>;
  const projectId = body.projectId?.trim();
  if (!projectId) return json({ ok: false, error: 'projectId zorunlu.' }, 400);

  const { data: project, error: projectError } = await context.supabase
    .from('unity_game_projects')
    .select('id')
    .eq('id', projectId)
    .eq('workspace_id', context.workspaceId)
    .eq('user_id', context.userId)
    .maybeSingle();

  if (projectError || !project) {
    return json({ ok: false, error: 'Proje bulunamadı.' }, 404);
  }

  const { data: jobs, error: jobsError } = await context.supabase
    .from('unity_build_jobs')
    .select('id, status, started_at, artifact_url, error_message, metadata')
    .eq('unity_game_project_id', projectId)
    .eq('workspace_id', context.workspaceId)
    .order('created_at', { ascending: false });

  if (jobsError) return json({ ok: false, error: jobsError.message }, 400);

  let projectStatus: string | null = null;
  let updatedJobs = 0;
  let attemptedJobs = 0;
  const errors: RefreshError[] = [];

  for (const rawJob of (jobs ?? []) as UnityBuildJobRow[]) {
    const metadata = (rawJob.metadata ?? {}) as Record<string, unknown>;
    const unityBuildNumber = metadata.unityBuildNumber;
    const unityBuildTargetId = metadata.unityBuildTargetId;

    if (typeof unityBuildNumber !== 'number' || typeof unityBuildTargetId !== 'string' || !unityBuildTargetId.trim()) {
      continue;
    }

    attemptedJobs += 1;

    let unity;
    try {
      unity = await getBuildStatus(unityBuildTargetId, unityBuildNumber);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Build durumu alınamadı.';
      errors.push({ jobId: rawJob.id, message });
      console.error('builds.refresh getBuildStatus failed', {
        projectId,
        jobId: rawJob.id,
        message
      });
      continue;
    }

    const nextStatus = mapUnityStatusToDbStatus(unity.status);

    if (!projectStatus) {
      projectStatus = mapUnityStatusToProjectStatus(unity.status);
    }

    const mergedMetadata = {
      ...metadata,
      unityStatus: unity.status,
      unityFinished: unity.finished ?? null,
      unityDownloadUrl: unity.links?.download_primary?.href ?? null
    };

    const patch: Record<string, unknown> = {
      metadata: mergedMetadata,
      status: nextStatus ?? rawJob.status ?? 'queued'
    };

    if (unity.status === 'success') {
      patch.status = 'succeeded';
      patch.finished_at = unity.finished ?? new Date().toISOString();
      patch.artifact_url = unity.links?.download_primary?.href ?? rawJob.artifact_url ?? null;
      patch.artifact_type = 'aab';
      patch.error_message = null;
    } else if (unity.status === 'failure') {
      patch.status = 'failed';
      patch.finished_at = unity.finished ?? new Date().toISOString();
    } else if (unity.status === 'canceled') {
      patch.status = 'cancelled';
      patch.finished_at = unity.finished ?? new Date().toISOString();
    } else if (unity.status === 'queued' || unity.status === 'sentToBuilder' || unity.status === 'started' || unity.status === 'restarted') {
      patch.status = nextStatus ?? 'running';
      patch.finished_at = null;
      if (!rawJob.started_at) {
        patch.started_at = new Date().toISOString();
      }
    }

    const { error: updateError } = await context.supabase.from('unity_build_jobs').update(patch).eq('id', rawJob.id);
    if (updateError) {
      errors.push({ jobId: rawJob.id, message: updateError.message });
      console.error('builds.refresh update failed', {
        projectId,
        jobId: rawJob.id,
        message: updateError.message
      });
      continue;
    }

    updatedJobs += 1;
  }

  if (projectStatus) {
    await context.supabase
      .from('unity_game_projects')
      .update({ status: projectStatus })
      .eq('id', projectId)
      .eq('workspace_id', context.workspaceId)
      .eq('user_id', context.userId);
  }

  if (attemptedJobs > 0 && updatedJobs === 0 && errors.length > 0) {
    return json({ ok: false, error: errors[0]?.message ?? 'Buildler yenilenemedi.', updatedJobs, projectStatus, errors }, 502);
  }

  return json({ ok: true, updatedJobs, projectStatus, errors });
}

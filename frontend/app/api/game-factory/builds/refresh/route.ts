import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { getBuildStatus, type UnityBuildStatus } from '@/lib/unity-bridge';

type RefreshRequest = { projectId: string };

type UnityBuildJobRow = {
  id: string;
  status: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
};

function mapUnityStatusToDbStatus(status: UnityBuildStatus): string | null {
  if (status === 'queued') return 'queued';
  if (status === 'sentToBuilder' || status === 'started' || status === 'restarted') return 'building';
  if (status === 'success') return 'succeeded';
  if (status === 'failure') return 'failed';
  if (status === 'canceled') return 'canceled';
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
    .select('id, status, error_message, metadata')
    .eq('unity_game_project_id', projectId)
    .eq('workspace_id', context.workspaceId)
    .order('created_at', { ascending: false });

  if (jobsError) return json({ ok: false, error: jobsError.message }, 400);

  let projectStatus: string | null = null;
  let updatedJobs = 0;

  for (const rawJob of (jobs ?? []) as UnityBuildJobRow[]) {
    const metadata = (rawJob.metadata ?? {}) as Record<string, unknown>;
    const unityBuildNumber = metadata.unityBuildNumber;
    const unityBuildTargetId = metadata.unityBuildTargetId;

    if (typeof unityBuildNumber !== 'number' || typeof unityBuildTargetId !== 'string' || !unityBuildTargetId.trim()) {
      continue;
    }

    try {
      const unity = await getBuildStatus(unityBuildTargetId, unityBuildNumber);
      const nextStatus = mapUnityStatusToDbStatus(unity.status);

      if (!projectStatus) {
        projectStatus = mapUnityStatusToProjectStatus(unity.status);
      }

      if (!nextStatus) {
        continue;
      }

      const mergedMetadata = {
        ...metadata,
        unityStatus: unity.status,
        unityFinished: unity.finished ?? null,
        unityDownloadUrl: unity.links?.download_primary?.href ?? null
      };

      const patch: Record<string, unknown> = { metadata: mergedMetadata };

      if (unity.status === 'success') {
        patch.status = 'succeeded';
        patch.finished_at = unity.finished ?? new Date().toISOString();
        patch.artifact_url = unity.links?.download_primary?.href ?? null;
        patch.artifact_type = 'aab';
        patch.error_message = null;
      } else if (unity.status === 'failure') {
        patch.status = 'failed';
        patch.finished_at = unity.finished ?? new Date().toISOString();
        patch.error_message = rawJob.error_message;
      } else if (unity.status === 'canceled') {
        patch.status = 'canceled';
        patch.finished_at = unity.finished ?? new Date().toISOString();
        patch.error_message = rawJob.error_message;
      } else {
        patch.status = nextStatus;
      }

      const { error: updateError } = await context.supabase.from('unity_build_jobs').update(patch).eq('id', rawJob.id);
      if (!updateError) updatedJobs += 1;
    } catch {
      continue;
    }
  }

  if (projectStatus) {
    await context.supabase
      .from('unity_game_projects')
      .update({ status: projectStatus })
      .eq('id', projectId)
      .eq('workspace_id', context.workspaceId)
      .eq('user_id', context.userId);
  }

  return json({ ok: true, updatedJobs, projectStatus });
}

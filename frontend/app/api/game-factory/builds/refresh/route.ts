import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { getBuildStatus, resolveBuildTargetId, type UnityBuildStatus } from '@/lib/unity-bridge';

type RefreshRequest = {
  projectId: string;
};

type UnityBuildJobRow = {
  id: string;
  status: string | null;
  build_target_id: string | null;
  metadata: Record<string, unknown> | null;
  artifact_url: string | null;
};

function mapUnityStatusToJobStatus(status: UnityBuildStatus): string {
  if (status === 'queued') return 'queued';
  if (status === 'sentToBuilder' || status === 'started' || status === 'restarted') return 'started';
  if (status === 'success') return 'success';
  if (status === 'failure') return 'failure';
  if (status === 'canceled') return 'cancelled';
  return 'started';
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
    .select('id, status, build_target_id, metadata, artifact_url')
    .eq('unity_game_project_id', projectId)
    .eq('workspace_id', context.workspaceId)
    .in('status', ['queued', 'started'])
    .order('created_at', { ascending: false });

  if (jobsError) return json({ ok: false, error: jobsError.message }, 400);

  const results: Array<{
    jobId: string;
    previousStatus: string | null;
    unityStatus?: UnityBuildStatus;
    newStatus?: string;
    ok: boolean;
    error?: string;
  }> = [];

  for (const job of (jobs ?? []) as UnityBuildJobRow[]) {
    const metadata = (job.metadata ?? {}) as Record<string, unknown>;
    const unityBuildNumber = metadata.unityBuildNumber;
    const metadataBuildTargetId = metadata.unityBuildTargetId;

    if (
      typeof unityBuildNumber !== 'number' ||
      !Number.isInteger(unityBuildNumber) ||
      unityBuildNumber < 1 ||
      typeof metadataBuildTargetId !== 'string' ||
      !metadataBuildTargetId.trim()
    ) {
      results.push({
        jobId: job.id,
        previousStatus: job.status,
        ok: false,
        error: 'Geçerli unityBuildNumber / unityBuildTargetId bulunamadı.'
      });
      continue;
    }

    try {
      let unityBuildTargetId = metadataBuildTargetId.trim();
      if (typeof job.build_target_id === 'string' && job.build_target_id.trim() === 'android-aab-release') {
        unityBuildTargetId = await resolveBuildTargetId(job.build_target_id.trim());
      }

      const unity = await getBuildStatus(unityBuildTargetId, unityBuildNumber);
      const nextStatus = mapUnityStatusToJobStatus(unity.status);

      const patch: Record<string, unknown> = {
        status: nextStatus,
        metadata: {
          ...metadata,
          unityStatus: unity.status,
          unityFinished: unity.finished ?? null,
          unityDownloadUrl: unity.links?.download_primary?.href ?? null
        }
      };

      if (unity.status === 'success') {
        patch.finished_at = unity.finished ?? new Date().toISOString();
        patch.artifact_url = unity.links?.download_primary?.href ?? job.artifact_url ?? null;
        patch.error_message = null;
      } else if (unity.status === 'failure' || unity.status === 'canceled') {
        patch.finished_at = unity.finished ?? new Date().toISOString();
      } else {
        patch.finished_at = null;
      }

      const { error: updateError } = await context.supabase.from('unity_build_jobs').update(patch).eq('id', job.id);
      if (updateError) {
        results.push({
          jobId: job.id,
          previousStatus: job.status,
          unityStatus: unity.status,
          ok: false,
          error: updateError.message
        });
        continue;
      }

      results.push({
        jobId: job.id,
        previousStatus: job.status,
        unityStatus: unity.status,
        newStatus: nextStatus,
        ok: true
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Build durumu alınamadı.';
      results.push({
        jobId: job.id,
        previousStatus: job.status,
        ok: false,
        error: message
      });
    }
  }

  return json({
    ok: true,
    projectId,
    total: jobs?.length ?? 0,
    updated: results.filter((item) => item.ok).length,
    results
  });
}

import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { getBuildStatus } from '@/lib/unity-bridge';

type JobRow = {
  id: string;
  unity_game_project_id: string;
  build_target: string;
  metadata: { unityBuildNumber?: number } | null;
};

export async function GET(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId')?.trim();

  if (!jobId) return json({ ok: false, error: 'jobId zorunlu.' }, 400);

  const { data: job, error: jobError } = await context.supabase
    .from('unity_build_jobs')
    .select('id, unity_game_project_id, build_target, metadata')
    .eq('id', jobId)
    .eq('workspace_id', context.workspaceId)
    .maybeSingle();

  if (jobError || !job) return json({ ok: false, error: 'Build işi bulunamadı.' }, 404);

  const typedJob = job as JobRow;
  const buildNumber = typedJob.metadata?.unityBuildNumber;

  if (typeof buildNumber !== 'number') {
    return json({ ok: false, error: 'Build numarası bulunamadı.' }, 400);
  }

  const unityStatus = await getBuildStatus(typedJob.build_target, buildNumber);
  let status = 'running';
  let artifactUrl: string | null = null;

  if (unityStatus.status === 'success') {
    status = 'success';
    artifactUrl = unityStatus.links?.download_primary?.href ?? null;
    await context.supabase
      .from('unity_build_jobs')
      .update({
        status,
        artifact_url: artifactUrl,
        finished_at: new Date().toISOString(),
        error_message: null
      })
      .eq('id', jobId);
    await context.supabase.from('unity_game_projects').update({ status: 'build_ready' }).eq('id', typedJob.unity_game_project_id);
  } else if (unityStatus.status === 'failure') {
    status = 'failed';
    await context.supabase
      .from('unity_build_jobs')
      .update({ status, error_message: 'Build başarısız oldu.' })
      .eq('id', jobId);
    await context.supabase.from('unity_game_projects').update({ status: 'failed' }).eq('id', typedJob.unity_game_project_id);
  } else if (unityStatus.status === 'queued' || unityStatus.status === 'sentToBuilder' || unityStatus.status === 'started') {
    status = 'running';
    await context.supabase.from('unity_build_jobs').update({ status }).eq('id', jobId);
  }

  return json({ ok: true, status, artifactUrl, logs: null });
}

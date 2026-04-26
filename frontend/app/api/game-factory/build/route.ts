import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { triggerBuild } from '@/lib/unity-bridge';

type BuildRequest = { projectId: string };

export async function POST(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  const body = (await request.json()) as Partial<BuildRequest>;
  const projectId = body.projectId?.trim();
  if (!projectId) return json({ ok: false, error: 'projectId zorunlu.' }, 400);

  const { data: project, error: projectError } = await context.supabase
    .from('unity_game_projects')
    .select('id, approval_status')
    .eq('id', projectId)
    .eq('workspace_id', context.workspaceId)
    .eq('user_id', context.userId)
    .maybeSingle();

  if (projectError || !project) {
    return json({ ok: false, error: 'Proje bulunamadı.' }, 404);
  }

  if (project.approval_status !== 'approved') {
    return json({ ok: false, error: 'Proje onay bekliyor.' }, 403);
  }

  const buildTargetId = process.env.UNITY_BUILD_TARGET_ID?.trim();
  if (!buildTargetId) return json({ ok: false, error: 'UNITY_BUILD_TARGET_ID eksik.' }, 500);

  const unityResponse = await triggerBuild(buildTargetId);

  const queuedAt = new Date().toISOString();
  const { data: insertedJob, error: jobError } = await context.supabase
    .from('unity_build_jobs')
    .insert({
      unity_game_project_id: projectId,
      workspace_id: context.workspaceId,
      requested_by: context.userId,
      build_target: buildTargetId,
      build_type: 'android',
      status: 'queued',
      queued_at: queuedAt,
      metadata: {
        unityBuildNumber: unityResponse.build,
        unityBuildTargetId: unityResponse.buildTargetId
      }
    })
    .select('id')
    .single();

  if (jobError || !insertedJob) {
    return json({ ok: false, error: jobError?.message ?? 'Build kaydı oluşturulamadı.' }, 400);
  }

  await context.supabase.from('unity_game_projects').update({ status: 'building' }).eq('id', projectId);

  return json({ ok: true, jobId: insertedJob.id, unityBuildNumber: unityResponse.build });
}

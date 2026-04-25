import { Nav } from '@/components/nav';
import { getAppContextOrRedirect } from '@/lib/app-context';
import { deriveQueuePreview, toPlatformLabel, toQueueActionLabel, toQueueStateHint, toQueueStatusLabel } from '@/lib/publish-queue';
import { updatePublishStatusAction } from '@/app/composer/actions';

export const dynamic = 'force-dynamic';

export default async function PublishQueuePage() {
  const { supabase, workspace } = await getAppContextOrRedirect();

  const { data: jobs } = await supabase
    .from('publish_jobs')
    .select('id, status, target_platform, content_output_id, queued_at, project_id, payload')
    .eq('workspace_id', workspace.workspaceId)
    .order('queued_at', { ascending: false })
    .limit(50);

  const relatedContentIds = Array.from(new Set((jobs ?? []).map((job) => job.content_output_id).filter(Boolean)));
  const relatedProjectIds = Array.from(new Set((jobs ?? []).map((job) => job.project_id).filter(Boolean)));

  const [{ data: relatedContentItems }, { data: relatedProjects }] = await Promise.all([
    relatedContentIds.length
      ? supabase
          .from('content_items')
          .select('id, brief, youtube_title, youtube_description, instagram_caption, tiktok_caption, saved_output_id')
          .eq('workspace_id', workspace.workspaceId)
          .in('id', relatedContentIds)
      : Promise.resolve({ data: [], error: null }),
    relatedProjectIds.length
      ? supabase.from('projects').select('id, name').eq('workspace_id', workspace.workspaceId).in('id', relatedProjectIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  const savedOutputIds = Array.from(new Set((relatedContentItems ?? []).map((item) => item.saved_output_id).filter(Boolean)));
  const { data: relatedSavedOutputs } = savedOutputIds.length
    ? await supabase.from('saved_outputs').select('id, title, content').eq('workspace_id', workspace.workspaceId).in('id', savedOutputIds)
    : { data: [] };

  const contentById = new Map((relatedContentItems ?? []).map((item) => [item.id, item]));
  const projectById = new Map((relatedProjects ?? []).map((project) => [project.id, project]));
  const savedById = new Map((relatedSavedOutputs ?? []).map((item) => [item.id, item]));

  return (
    <main>
      <Nav />
      <section className="panel">
        <h2 className="mb-1 text-xl font-semibold">Yayın Kuyruğu</h2>
        <p className="mb-3 text-xs text-white/60">Kuyruk durumları: queued, preparing, waiting_for_approval, published, failed.</p>
        {jobs && jobs.length > 0 ? (
          <div className="space-y-3 text-sm">
            {jobs.map((job) => {
              const relatedContent = job.content_output_id ? contentById.get(job.content_output_id) : null;
              const relatedProject = job.project_id ? projectById.get(job.project_id) : null;
              const relatedSaved = relatedContent?.saved_output_id ? savedById.get(relatedContent.saved_output_id) : null;
              const preview = deriveQueuePreview({
                payload: job.payload,
                targetPlatform: job.target_platform,
                contentItem: relatedContent,
                savedOutput: relatedSaved
              });

              return (
                <form key={job.id} action={updatePublishStatusAction} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <input type="hidden" name="job_id" value={job.id} />
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="font-medium text-white/90">{toPlatformLabel(job.target_platform)}</p>
                    <span className="text-white/45">•</span>
                    <p className="text-white/80">{toQueueStatusLabel(job.status)}</p>
                    <span className="text-white/45">•</span>
                    <p className="text-xs text-white/60">{toQueueStateHint(job.status)}</p>
                  </div>
                  <p className="mt-2 text-white/80">İçerik özeti: {preview.summary}</p>
                  <p className="text-xs text-white/60">Proje: {relatedProject?.name ?? 'Bağlı proje yok'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button name="status" value="queued" className="rounded-md border border-white/20 px-2 py-1">{toQueueActionLabel('queued')}</button>
                    <button name="status" value="preparing" className="rounded-md border border-white/20 px-2 py-1">{toQueueActionLabel('preparing')}</button>
                    <button name="status" value="waiting_for_approval" className="rounded-md border border-white/20 px-2 py-1">{toQueueActionLabel('waiting_for_approval')}</button>
                    <button name="status" value="published" className="rounded-md border border-white/20 px-2 py-1">{toQueueActionLabel('published')}</button>
                    <button name="status" value="failed" className="rounded-md border border-white/20 px-2 py-1">{toQueueActionLabel('failed')}</button>
                  </div>
                </form>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/70">Henüz yayın kuyruğu bulunmuyor.</div>
        )}
      </section>
    </main>
  );
}

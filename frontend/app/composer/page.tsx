import { Nav } from '@/components/nav';
import { getAppContextOrRedirect } from '@/lib/app-context';
import { deriveQueuePreview, toPlatformLabel, toQueueStateHint, toQueueStatusLabel } from '@/lib/publish-queue';
import { createContentJobAction, updatePublishStatusAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function ComposerPage() {
  const { supabase, workspace } = await getAppContextOrRedirect();

  const [{ data: projects }, { data: items }, { data: jobs }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('workspace_id', workspace.workspaceId).order('created_at', { ascending: false }),
    supabase
      .from('content_items')
      .select('id, brief, platforms, youtube_title, instagram_caption, tiktok_caption, created_at')
      .eq('workspace_id', workspace.workspaceId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('publish_jobs')
      .select('id, status, target_platform, content_output_id, queued_at, project_id, payload')
      .eq('workspace_id', workspace.workspaceId)
      .order('queued_at', { ascending: false })
      .limit(20)
  ]);

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
      <section className="panel mb-4">
        <h2 className="mb-1 text-xl font-semibold">Yayın Kuyruğu (ikincil alan)</h2>
        <p className="mb-3 text-sm text-white/65">Sosyal içerik hazırlığı bu alanda yönetilir. Çekirdek akış için önce Agentlar ekranını kullanın.</p>
        <form action={createContentJobAction} className="space-y-3">
          <label className="block text-sm">
            Proje
            <select name="project_id" className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2">
              <option value="">Projeye bağlama (opsiyonel)</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            Brief
            <textarea
              required
              name="brief"
              rows={4}
              placeholder="Ne üretmek istiyorsun? Hedef kitle, ton, CTA..."
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2"
            />
          </label>

          <fieldset>
            <legend className="text-sm">Platform varyantları</legend>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <label><input type="checkbox" name="platforms" value="youtube" defaultChecked /> YouTube</label>
            </div>
          </fieldset>

          <button type="submit" className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink">
            Varyantları Üret ve Kaydet
          </button>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Son Üretilen İçerikler</h3>
          {items && items.length > 0 ? (
            <div className="space-y-3 text-sm">
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border border-white/10 p-3">
                  <p className="text-xs text-white/60">{new Date(item.created_at).toLocaleString('tr-TR')}</p>
                  <p className="mt-1 font-medium">Brief: {item.brief}</p>
                  <p className="line-clamp-2 text-white/75">YouTube: {item.youtube_title ?? 'Başlık yok'}</p>
                  <p className="text-xs text-white/55">Platformlar: {(item.platforms ?? []).join(', ') || 'Belirtilmedi'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/70">Henüz yayın kuyruğu yok. Önce sosyal içerik üret.</div>
          )}
        </article>

        <article className="panel">
          <h3 className="mb-1 text-lg font-semibold">Yayın Kuyruğu</h3>
          <p className="mb-3 text-xs text-white/60">Sıraya alınan gönderiler ve hazırlık durumları mevcut alanlarla listelenir.</p>
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
                    <p className="mt-1 text-xs text-white/55">Kuyruğa alınma: {job.queued_at ? new Date(job.queued_at).toLocaleString('tr-TR') : 'Zaman bilgisi yok'}</p>
                    <p className="mt-2 text-white/80">İçerik özeti: {preview.summary}</p>
                    {preview.detail ? <p className="text-xs text-white/65">Detay: {preview.detail}</p> : null}
                    <p className="text-xs text-white/60">Proje: {relatedProject?.name ?? 'Bağlı proje yok'}</p>
                    <p className="text-xs text-white/60">İçerik kaynağı: {job.content_output_id ?? 'İçerik kaydı bulunamadı'}</p>
                    {preview.payloadPartial ? <p className="mt-1 text-xs text-amber-200">Uyarı: Payload alanı kısmi görünüyor; önizleme ilişkili içerikten türetildi.</p> : null}
                    {!relatedContent && job.content_output_id ? <p className="mt-1 text-xs text-amber-200">Bağlı içerik kaydı artık bulunamıyor olabilir.</p> : null}
                    <details className="mt-2 rounded-md border border-white/10 bg-black/30 p-2">
                      <summary className="cursor-pointer text-xs text-white/70">Detaylı önizlemeyi aç</summary>
                      <p className="mt-2 text-xs text-white/70">{preview.detail ?? 'Detay yok.'}</p>
                      <p className="text-xs text-white/55">İş kimliği: {job.id}</p>
                    </details>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button name="status" value="draft" className="rounded-md border border-white/20 px-2 py-1">Taslak</button>
                      <button name="status" value="queued" className="rounded-md border border-white/20 px-2 py-1">Sıraya Alındı</button>
                      <button name="status" value="processing" className="rounded-md border border-white/20 px-2 py-1">İşleniyor</button>
                      <button name="status" value="published" className="rounded-md border border-white/20 px-2 py-1">Yayın hazırlığında</button>
                      <button name="status" value="failed" className="rounded-md border border-white/20 px-2 py-1">Başarısız</button>
                    </div>
                  </form>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/70">
              Henüz yayın kuyruğu yok. Önce sosyal içerik üret.
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

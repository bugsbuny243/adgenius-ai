import { Nav } from '@/components/nav';
import { getAppContextOrRedirect } from '@/lib/app-context';
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
      .select('id, status, target_platform, content_output_id, queued_at')
      .eq('workspace_id', workspace.workspaceId)
      .order('queued_at', { ascending: false })
      .limit(10)
  ]);

  return (
    <main>
      <Nav />
      <section className="panel mb-4">
        <h2 className="mb-3 text-xl font-semibold">İçerik Oluşturucu</h2>
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
              <label><input type="checkbox" name="platforms" value="instagram" defaultChecked /> Instagram</label>
              <label><input type="checkbox" name="platforms" value="tiktok" defaultChecked /> TikTok</label>
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
                  <p>YouTube: {item.youtube_title}</p>
                  <p>Instagram: {item.instagram_caption}</p>
                  <p>TikTok: {item.tiktok_caption}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/70">Henüz içerik işi yok.</p>
          )}
        </article>

        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Yayın Kuyruğu (Mock)</h3>
          {jobs && jobs.length > 0 ? (
            <div className="space-y-2 text-sm">
              {jobs.map((job) => (
                <form key={job.id} action={updatePublishStatusAction} className="rounded-lg border border-white/10 p-3">
                  <input type="hidden" name="job_id" value={job.id} />
                  <p>{job.target_platform} • {job.queued_at ? new Date(job.queued_at).toLocaleString('tr-TR') : 'Tarih yok'}</p>
                  <p className="text-xs text-white/60">Content item: {job.content_output_id ?? '-'} </p>
                  <p className="mb-2 text-white/70">Mevcut durum: {job.status}</p>
                  <div className="flex gap-2">
                    <button name="status" value="draft" className="rounded-md border border-white/20 px-2 py-1">Taslak</button>
                    <button name="status" value="queued" className="rounded-md border border-white/20 px-2 py-1">Sıraya Al</button>
                    <button name="status" value="failed" className="rounded-md border border-white/20 px-2 py-1">Başarısız</button>
                  </div>
                </form>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/70">Henüz kuyruk kaydı yok.</p>
          )}
        </article>
      </section>
    </main>
  );
}

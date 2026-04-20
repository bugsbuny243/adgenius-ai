import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';
import { deriveQueuePreview, toPlatformLabel, toQueueStateHint, toQueueStatusLabel } from '@/lib/publish-queue';
import { createProjectItemAction } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { workspaceId, userId } = await getWorkspaceContext();
  const createItem = createProjectItemAction.bind(null, id);

  const { data: project } = await supabase.from('projects').select('id, name, description, created_at').eq('id', id).eq('workspace_id', workspaceId).eq('user_id', userId).maybeSingle();
  if (!project) notFound();

  const [{ data: items }, { data: outputs }, { data: contentItems }] = await Promise.all([
    supabase.from('project_items').select('id, item_type, title, content, created_at').eq('project_id', project.id).eq('user_id', userId).eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
    supabase.from('saved_outputs').select('id, title, content, created_at').eq('project_id', project.id).eq('workspace_id', workspaceId).eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    supabase.from('content_items').select('id, brief, youtube_title, youtube_description, instagram_caption, tiktok_caption, created_at').eq('project_id', project.id).eq('workspace_id', workspaceId).eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
  ]);

  const contentIds = (contentItems ?? []).map((item) => item.id);
  const { data: jobs } = contentIds.length
    ? await supabase.from('publish_jobs').select('id, status, target_platform, queued_at, content_output_id, payload, project_id').eq('workspace_id', workspaceId).in('content_output_id', contentIds).order('queued_at', { ascending: false }).limit(15)
    : { data: [] };

  const contentById = new Map((contentItems ?? []).map((item) => [item.id, item]));

  const lastActivity = [project.created_at, ...(items ?? []).map((item) => item.created_at), ...(outputs ?? []).map((item) => item.created_at), ...(contentItems ?? []).map((item) => item.created_at)]
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  return (
    <main>
      <Nav />
      <section className="panel mb-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{project.name}</h2>
            <p className="text-sm text-white/70">{project.description || 'Açıklama henüz eklenmedi.'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/agents" className="rounded-lg border border-neon/40 px-3 py-2 text-sm text-neon">Bu proje için yeni çalışma başlat</Link>
            <Link href="/agents" className="rounded-lg border border-white/20 px-3 py-2 text-sm">Bu proje için sosyal içerik üret</Link>
            <Link href="/saved" className="rounded-lg border border-white/20 px-3 py-2 text-sm">Kaydedilmiş çıktıyı yeniden işle</Link>
          </div>
        </div>

        <div className="grid gap-2 text-sm md:grid-cols-5">
          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Toplam öğe: {items?.length ?? 0}</p>
          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Toplam saved output: {outputs?.length ?? 0}</p>
          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Toplam social content: {contentItems?.length ?? 0}</p>
          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Queue öğesi: {jobs?.length ?? 0}</p>
          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Son aktivite: {new Date(lastActivity).toLocaleString('tr-TR')}</p>
        </div>
      </section>

      <section className="panel mb-4">
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          <a href="#genel" className="rounded border border-white/20 px-2 py-1">Genel Bakış</a>
          <a href="#ogeler" className="rounded border border-white/20 px-2 py-1">Proje Öğeleri</a>
          <a href="#kayitlar" className="rounded border border-white/20 px-2 py-1">Kaydedilen Çıktılar</a>
          <a href="#sosyal" className="rounded border border-white/20 px-2 py-1">Sosyal İçerikler</a>
          <a href="#kuyruk" className="rounded border border-white/20 px-2 py-1">Kuyruk Öğeleri</a>
        </div>

        <form action={createItem} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
          <input name="title" required placeholder="Öğe başlığı" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
          <input name="details" placeholder="Öğe detayları (opsiyonel)" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
          <button type="submit" className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink">Öğe Ekle</button>
        </form>
      </section>

      <section id="genel" className="grid gap-4 lg:grid-cols-3">
        <article id="ogeler" className="panel lg:col-span-2">
          <h3 className="mb-3 text-lg font-semibold">Proje Öğeleri</h3>
          {(!items || items.length === 0) ? <p className="text-sm text-white/70">Bu proje henüz boş. İlk öğeyi ekleyebilir veya agent çıktısını projeye bağlayabilirsiniz.</p> : null}
          <div className="space-y-2">
            {(items ?? []).map((item) => (
              <div key={item.id} className="rounded-lg border border-white/10 px-3 py-2">
                <p className="font-medium">{item.title}</p>
                <p className="line-clamp-3 text-sm text-white/70">{item.content || 'İçerik henüz girilmedi.'}</p>
                <p className="text-xs text-white/50">Tür: {item.item_type} • {new Date(item.created_at).toLocaleString('tr-TR')}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel" id="kayitlar">
          <h3 className="mb-3 text-lg font-semibold">Kaydedilen Çıktılar</h3>
          {!outputs || outputs.length === 0 ? <p className="text-sm text-white/70">Bu projeye bağlı kayıtlı çıktı bulunmuyor.</p> : null}
          <div className="space-y-2">
            {(outputs ?? []).map((output) => (
              <div key={output.id} className="rounded-lg border border-white/10 px-3 py-2">
                <p className="font-medium">{output.title || 'Kaydedilen çıktı'}</p>
                <p className="line-clamp-2 text-sm text-white/70">{output.content}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section id="sosyal" className="panel mt-4">
        <h3 className="mb-3 text-lg font-semibold">Sosyal İçerikler</h3>
        {!contentItems || contentItems.length === 0 ? <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/70">Bu projede henüz sosyal içerik yok. Sosyal medya agentı ile içerik üretip bu projeye bağlayabilirsiniz.</div> : null}
        <div className="space-y-2">
          {(contentItems ?? []).map((contentItem) => (
            <div key={contentItem.id} className="rounded-lg border border-white/10 px-3 py-2">
              <p className="font-medium">Sosyal içerik öğesi</p>
              <p className="line-clamp-2 text-sm text-white/70">{contentItem.brief || contentItem.youtube_title || contentItem.instagram_caption || contentItem.tiktok_caption || 'İçerik özeti yok.'}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="kuyruk" className="panel mt-4">
        <h3 className="mb-3 text-lg font-semibold">Kuyruk Öğeleri</h3>
        {!jobs || jobs.length === 0 ? <p className="text-sm text-white/70">Henüz kuyrukta içerik yok.</p> : null}
        <div className="space-y-2">
          {(jobs ?? []).map((job) => {
            const relatedContent = job.content_output_id ? contentById.get(job.content_output_id) : null;
            const preview = deriveQueuePreview({ payload: job.payload, targetPlatform: job.target_platform, contentItem: relatedContent, savedOutput: null });
            return (
              <div key={job.id} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
                <p>{toPlatformLabel(job.target_platform)} • {toQueueStatusLabel(job.status)}</p>
                <p className="text-xs text-white/60">{toQueueStateHint(job.status)} • {job.queued_at ? new Date(job.queued_at).toLocaleString('tr-TR') : 'Tarih yok'}</p>
                <p className="text-white/75">{preview.summary}</p>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

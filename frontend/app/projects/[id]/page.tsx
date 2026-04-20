import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';
import { createProjectItemAction } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin');

  const { workspaceId, userId } = await getWorkspaceContext();

  const createItem = createProjectItemAction.bind(null, id);

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, description, created_at')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!project) notFound();

  const [{ data: items, error: itemsError }, { data: outputs, error: outputsError }, { data: contentItems, error: contentItemsError }] =
    await Promise.all([
      supabase
        .from('project_items')
        .select('id, item_type, title, content, saved_output_id, created_at, updated_at')
        .eq('project_id', project.id)
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false }),
      supabase
        .from('saved_outputs')
        .select('id, title, content, created_at')
        .eq('project_id', project.id)
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('content_items')
        .select('id, brief, created_at')
        .eq('project_id', project.id)
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

  return (
    <main>
      <Nav />
      <section className="panel mb-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{project.name}</h2>
            <p className="text-sm text-white/70">{project.description || 'Açıklama henüz eklenmedi.'}</p>
            <p className="mt-1 text-xs text-white/60">Oluşturulma: {new Date(project.created_at).toLocaleString('tr-TR')}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/agents" className="rounded-lg border border-neon/40 px-3 py-2 text-sm text-neon">Yeni çalışma başlat</Link>
            <Link href="/projects" className="rounded-lg border border-white/20 px-3 py-2 text-sm">Projelere dön</Link>
          </div>
        </div>

        <div className="grid gap-2 text-sm md:grid-cols-4">
          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Öğe sayısı: {items?.length ?? 0}</p>
          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Kaydedilen çıktı: {outputs?.length ?? 0}</p>
          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Sosyal içerik: {contentItems?.length ?? 0}</p>
          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Son hareket: {new Date(project.created_at).toLocaleDateString('tr-TR')}</p>
        </div>
      </section>

      <section className="panel mb-4">
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          <a href="#genel" className="rounded border border-white/20 px-2 py-1">Genel Bakış</a>
          <a href="#ogeler" className="rounded border border-white/20 px-2 py-1">Proje Öğeleri</a>
          <a href="#kayitlar" className="rounded border border-white/20 px-2 py-1">Kaydedilen Çıktılar</a>
          <a href="#sosyal" className="rounded border border-white/20 px-2 py-1">Sosyal İçerikler</a>
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
          {itemsError ? <p className="text-sm text-red-300">Öğeler yüklenemedi: {itemsError.message}</p> : null}
          {!itemsError && (!items || items.length === 0) ? <p className="text-sm text-white/70">Henüz proje öğesi yok. Aşağıdaki ajan çalıştırmalarından bir sonucu projeye bağlayabilirsiniz.</p> : null}
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
          {outputsError ? <p className="text-sm text-red-300">Kaydedilen çıktılar yüklenemedi: {outputsError.message}</p> : null}
          {!outputsError && (!outputs || outputs.length === 0) ? <p className="text-sm text-white/70">Bu projeye bağlı kayıtlı çıktı bulunmuyor.</p> : null}
          <div className="space-y-2">
            {(outputs ?? []).map((output) => (
              <div key={output.id} className="rounded-lg border border-white/10 px-3 py-2">
                <p className="font-medium">{output.title || 'Kaydedilen çıktı'}</p>
                <p className="line-clamp-2 text-sm text-white/70">{output.content}</p>
                <p className="text-xs text-white/50">{new Date(output.created_at).toLocaleString('tr-TR')}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section id="sosyal" className="panel mt-4">
        <h3 className="mb-3 text-lg font-semibold">Sosyal İçerikler</h3>
        {contentItemsError ? <p className="text-sm text-red-300">İçerik öğeleri yüklenemedi: {contentItemsError.message}</p> : null}
        {!contentItemsError && (!contentItems || contentItems.length === 0) ? (
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/70">
            Bu projede henüz sosyal içerik yok. "Yeni çalışma başlat" ile sosyal medya agentını çalıştırıp projeye bağlayabilirsiniz.
          </div>
        ) : null}
        <div className="space-y-2">
          {(contentItems ?? []).map((contentItem) => (
            <div key={contentItem.id} className="rounded-lg border border-white/10 px-3 py-2">
              <p className="font-medium">Sosyal içerik öğesi</p>
              <p className="line-clamp-3 text-sm text-white/70">{contentItem.brief || 'Brief kaydı yok.'}</p>
              <p className="text-xs text-white/50">Eklenme: {new Date(contentItem.created_at).toLocaleString('tr-TR')}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

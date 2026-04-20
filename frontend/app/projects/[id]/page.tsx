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

  if (!project) {
    notFound();
  }

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
            <Link href={`/agents`} className="rounded-lg border border-neon/40 px-3 py-2 text-sm text-neon">Yeni çalışma başlat</Link>
            <Link href="/projects" className="rounded-lg border border-white/20 px-3 py-2 text-sm">Projelere dön</Link>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <a href="#genel-bakis" className="rounded border border-white/20 px-2 py-1">Genel Bakış</a>
          <a href="#proje-ogeleri" className="rounded border border-white/20 px-2 py-1">Proje Öğeleri</a>
          <a href="#kaydedilen-ciktilar" className="rounded border border-white/20 px-2 py-1">Kaydedilen Çıktılar</a>
          <a href="#sosyal-icerikler" className="rounded border border-white/20 px-2 py-1">Sosyal İçerikler</a>
        </div>

        <form action={createItem} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
          <input
            name="title"
            required
            placeholder="Öğe başlığı"
            className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
          />
          <input
            name="details"
            placeholder="Öğe detayları (opsiyonel)"
            className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
          />
          <button type="submit" className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink">
            Öğe Ekle
          </button>
        </form>
      </section>

      <section id="genel-bakis" className="panel mb-4">
        <h3 className="mb-2 text-lg font-semibold">Genel Bakış</h3>
        <div className="grid gap-2 text-sm md:grid-cols-4">
          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Proje öğeleri: {items?.length ?? 0}</p>
          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Kaydedilen çıktılar: {outputs?.length ?? 0}</p>
          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Sosyal içerikler: {contentItems?.length ?? 0}</p>
          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Son hareket: {new Date(project.created_at).toLocaleDateString('tr-TR')}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article id="proje-ogeleri" className="panel">
          <h3 className="mb-3 text-lg font-semibold">Proje Öğeleri</h3>
          {itemsError ? (
            <p className="text-sm text-red-300">Öğeler yüklenemedi: {itemsError.message}</p>
          ) : items && items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border border-white/10 px-3 py-2">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-white/70 line-clamp-3">{item.content || 'İçerik henüz girilmedi.'}</p>
                  <p className="text-xs text-white/50">İçerik türü: {item.item_type}</p>
                  {item.saved_output_id ? (
                    <p className="text-xs text-white/50">Kaydedilen çıktı: {item.saved_output_id}</p>
                  ) : null}
                  <p className="text-xs text-white/50">Eklenme: {new Date(item.created_at).toLocaleString('tr-TR')}</p>
                  <p className="text-xs text-white/50">Son güncelleme: {new Date(item.updated_at ?? item.created_at).toLocaleString('tr-TR')}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/70">Henüz öğe yok.</p>
          )}
        </article>

        <article id="kaydedilen-ciktilar" className="panel">
          <h3 className="mb-3 text-lg font-semibold">Son Kaydedilen Çıktılar</h3>
          {outputsError ? (
            <p className="text-sm text-red-300">Kaydedilen çıktılar yüklenemedi: {outputsError.message}</p>
          ) : outputs && outputs.length > 0 ? (
            <div className="space-y-2">
              {outputs.map((output) => (
                <div key={output.id} className="rounded-lg border border-white/10 px-3 py-2">
                  <p className="font-medium">{output.title || 'Kaydedilen çıktı'}</p>
                  <p className="text-sm text-white/70 line-clamp-3">{output.content}</p>
                  <p className="text-xs text-white/50">{new Date(output.created_at).toLocaleString('tr-TR')}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/70">Bu projeye bağlı kayıtlı çıktı bulunmuyor.</p>
          )}
        </article>

        <article id="sosyal-icerikler" className="panel lg:col-span-2">
          <h3 className="mb-3 text-lg font-semibold">İçerik Öğeleri</h3>
          {contentItemsError ? (
            <p className="text-sm text-red-300">İçerik öğeleri yüklenemedi: {contentItemsError.message}</p>
          ) : contentItems && contentItems.length > 0 ? (
            <div className="space-y-2">
              {contentItems.map((contentItem) => (
                <div key={contentItem.id} className="rounded-lg border border-white/10 px-3 py-2">
                  <p className="font-medium">İçerik öğesi</p>
                  <p className="text-sm text-white/70 line-clamp-3">{contentItem.brief || 'Brief kaydı yok.'}</p>
                  <p className="text-xs text-white/50">Eklenme: {new Date(contentItem.created_at).toLocaleString('tr-TR')}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70">
              Bu projede sosyal içerik bulunmuyor. Agent çalıştırırken projeyi seçip ilk içeriği başlatabilirsiniz.
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

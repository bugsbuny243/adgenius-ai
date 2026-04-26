import type { Metadata } from 'next';
import { Nav } from '@/components/nav';
import { SavedList } from '@/components/saved-list';
import { getAppContextOrRedirect } from '@/lib/app-context';
import { deleteSavedOutputAction } from './actions';

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export const dynamic = 'force-dynamic';

export default async function SavedPage() {
  const { supabase, workspace } = await getAppContextOrRedirect();

  const { data, error } = await supabase
    .from('saved_outputs')
    .select('id, title, content, created_at, agent_run_id, project_id, agent_runs(id, agent_type_id)')
    .eq('workspace_id', workspace.workspaceId)
    .order('created_at', { ascending: false })
    .limit(100);

  async function onDelete(id: string) {
    'use server';
    const formData = new FormData();
    formData.set('id', id);
    await deleteSavedOutputAction(formData);
  }

  return (
    <main>
      <Nav />
      <section className="panel">
        <h2 className="mb-1 text-xl font-semibold">Kaydedilen Çıktılar</h2>
        <p className="mb-3 text-sm text-white/70">Tekrar kullanım merkezi: kopyala, aç, sonuca git, yeniden çalıştır.</p>
        {error ? (
          <p className="text-sm text-red-300">Kayıtlar alınamadı: {error.message}</p>
        ) : data && data.length > 0 ? (
          <SavedList items={data} onDelete={onDelete} />
        ) : (
          <p className="text-sm text-white/70">Kaydedilmiş çıktı bulunmuyor. Agent sonucundan “Kaydet” ile bu alanı doldurabilirsiniz.</p>
        )}
      </section>
    </main>
  );
}

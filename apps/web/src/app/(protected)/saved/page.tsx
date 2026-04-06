'use client';

import { useEffect, useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';
import { resolveWorkspaceContext } from '@/lib/workspace';

type SavedOutputRow = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  agent_runs: {
    agent_types: {
      name: string;
      slug: string;
    } | null;
  } | null;
};

export default function SavedPage() {
  const [rows, setRows] = useState<SavedOutputRow[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<string | null>(null);

  useEffect(() => {
    async function loadSaved(): Promise<void> {
      try {
        const supabase = createBrowserSupabase();
        const { workspace, user } = await resolveWorkspaceContext(supabase);

        const { data, error: loadError } = await supabase
          .from('saved_outputs')
          .select('id, title, content, created_at, agent_runs(agent_types(name, slug))')
          .eq('workspace_id', workspace.id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (loadError) {
          setError(loadError.message);
          return;
        }

        setRows((data ?? []) as unknown as SavedOutputRow[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadSaved();
  }, []);

  async function onDelete(id: string): Promise<void> {
    const ok = window.confirm('Bu kaydı silmek istediğine emin misin?');
    if (!ok) {
      return;
    }

    try {
      const supabase = createBrowserSupabase();
      const { error: deleteError } = await supabase.from('saved_outputs').delete().eq('id', id);

      if (deleteError) {
        setError(`Silme başarısız: ${deleteError.message}`);
        return;
      }

      setRows((prev) => prev.filter((row) => row.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silme sırasında hata oluştu.');
    }
  }

  async function onCopy(content: string): Promise<void> {
    await navigator.clipboard.writeText(content);
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Kayıtlı çıktılar</h1>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="space-y-3">
        {isLoading ? (
          <p className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-300">Kayıtlı çıktılar yükleniyor...</p>
        ) : null}

        {rows.map((item) => (
          <article key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-medium text-zinc-100">{item.title}</h2>
              <p className="text-xs text-zinc-400">{new Date(item.created_at).toLocaleString('tr-TR')}</p>
            </div>
            <p className="mt-1 text-xs text-zinc-400">{item.agent_runs?.agent_types?.name ?? item.agent_runs?.agent_types?.slug ?? 'Agent'}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">
              {item.content.length > 260 ? `${item.content.slice(0, 260)}...` : item.content}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedContent(item.content)}
                className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:border-zinc-500"
              >
                Tamamını Gör
              </button>
              <button
                type="button"
                onClick={() => void onCopy(item.content)}
                className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:border-zinc-500"
              >
                Kopyala
              </button>
              <button
                type="button"
                onClick={() => void onDelete(item.id)}
                className="rounded-md border border-rose-700 px-3 py-1 text-xs text-rose-300 hover:border-rose-500"
              >
                Sil
              </button>
            </div>
          </article>
        ))}

        {rows.length === 0 && !error && !isLoading ? (
          <p className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-300">Henüz kaydedilmiş çıktı bulunmuyor.</p>
        ) : null}
      </div>

      {selectedContent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl rounded-xl border border-zinc-700 bg-zinc-900 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tam İçerik</h2>
              <button
                type="button"
                onClick={() => setSelectedContent(null)}
                className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-200"
              >
                Kapat
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-200">
              {selectedContent}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

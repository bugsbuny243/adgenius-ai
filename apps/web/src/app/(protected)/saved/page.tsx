'use client';

import { useEffect, useMemo, useState } from 'react';

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
  const [activeModalRow, setActiveModalRow] = useState<SavedOutputRow | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadSaved() {
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActiveModalRow(null);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const emptyStateVisible = useMemo(() => rows.length === 0 && !error && !isLoading, [rows.length, error, isLoading]);

  async function handleDelete(id: string) {
    const shouldDelete = window.confirm('Bu çıktıyı silmek istediğinden emin misin?');
    if (!shouldDelete || deletingId) {
      return;
    }

    setDeletingId(id);
    setError('');

    try {
      const supabase = createBrowserSupabase();
      const { error: deleteError } = await supabase.from('saved_outputs').delete().eq('id', id);

      if (deleteError) {
        setError('Çıktı silinemedi. Lütfen tekrar dene.');
        return;
      }

      setRows((current) => current.filter((item) => item.id !== id));
      if (activeModalRow?.id === id) {
        setActiveModalRow(null);
      }
    } catch {
      setError('Çıktı silinirken beklenmeyen bir hata oluştu.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCopy(id: string, content: string) {
    if (!content.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, 2000);
    } catch {
      setError('Kopyalama işlemi başarısız oldu.');
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Kayıtlı çıktılar</h1>
      {error ? <p className="rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p> : null}

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

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void handleCopy(item.id, item.content);
                }}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-500 hover:text-white"
              >
                {copiedId === item.id ? 'Kopyalandı ✓' : 'Kopyala'}
              </button>
              <button
                type="button"
                onClick={() => setActiveModalRow(item)}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-500 hover:text-white"
              >
                Tamamını Gör
              </button>
              <button
                type="button"
                disabled={deletingId === item.id}
                onClick={() => {
                  void handleDelete(item.id);
                }}
                className="rounded-md border border-rose-700/80 px-3 py-1.5 text-xs text-rose-200 hover:border-rose-500 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {deletingId === item.id ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </article>
        ))}

        {emptyStateVisible ? (
          <p className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-300">Henüz kaydedilmiş çıktı bulunmuyor.</p>
        ) : null}
      </div>

      {activeModalRow ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 px-4 py-8"
          onClick={() => setActiveModalRow(null)}
          role="presentation"
        >
          <div
            className="flex max-h-full w-full max-w-3xl flex-col rounded-2xl border border-zinc-800 bg-zinc-900"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Kaydedilmiş çıktı detayı"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <h2 className="text-base font-semibold text-zinc-100">{activeModalRow.title || 'Başlıksız çıktı'}</h2>
              <button
                type="button"
                className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:border-zinc-500 hover:text-white"
                onClick={() => setActiveModalRow(null)}
              >
                X
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-3">
              <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">{activeModalRow.content}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

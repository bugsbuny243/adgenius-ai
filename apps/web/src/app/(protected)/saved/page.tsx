'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { SkeletonList } from '@/components/ui/skeleton';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { resolveWorkspaceContext } from '@/lib/workspace';

type SavedOutputRow = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_favorite: boolean;
  tags: string[];
  project_name: string | null;
  agent_runs: {
    id: string;
    user_input: string;
    agent_types: {
      name: string;
      slug: string;
    } | null;
  } | null;
};

type SortKey = 'recent' | 'oldest';

export default function SavedPage() {
  const [rows, setRows] = useState<SavedOutputRow[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeModalRow, setActiveModalRow] = useState<SavedOutputRow | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('recent');

  useEffect(() => {
    async function loadSaved() {
      try {
        const supabase = createBrowserSupabase();
        const { workspace, user } = await resolveWorkspaceContext(supabase);

        const { data, error: loadError } = await supabase
          .from('saved_outputs')
          .select('id, title, content, created_at, is_favorite, tags, project_name, agent_runs(id, user_input, agent_types(name, slug))')
          .eq('workspace_id', workspace.id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);

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

  const visibleRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = rows.filter((item) => {
      if (!query) {
        return true;
      }

      return [item.title, item.content, item.project_name ?? '', ...(item.tags ?? [])].some((field) => field.toLowerCase().includes(query));
    });

    return filtered.sort((a, b) => {
      const left = new Date(a.created_at).getTime();
      const right = new Date(b.created_at).getTime();
      return sortBy === 'recent' ? right - left : left - right;
    });
  }, [rows, searchTerm, sortBy]);

  const emptyStateVisible = useMemo(() => visibleRows.length === 0 && !error && !isLoading, [visibleRows.length, error, isLoading]);

  async function updateRow(id: string, patch: Partial<SavedOutputRow>) {
    const supabase = createBrowserSupabase();

    const updatePayload: Record<string, unknown> = {};
    if ('is_favorite' in patch) {
      updatePayload.is_favorite = patch.is_favorite;
    }
    if ('tags' in patch) {
      updatePayload.tags = patch.tags;
    }
    if ('project_name' in patch) {
      updatePayload.project_name = patch.project_name;
    }

    const { error: updateError } = await supabase.from('saved_outputs').update(updatePayload).eq('id', id);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setRows((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

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

      <div className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 sm:grid-cols-3">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Başlık / etiket / içerik ara"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
        />
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortKey)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
        >
          <option value="recent">En yeni</option>
          <option value="oldest">En eski</option>
        </select>
        <p className="flex items-center text-sm text-zinc-400">Toplam: {visibleRows.length} çıktı</p>
      </div>

      <div className="space-y-3">
        {isLoading ? <SkeletonList items={4} /> : null}

        {visibleRows.map((item) => (
          <article key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-medium text-zinc-100">{item.title}</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void updateRow(item.id, { is_favorite: !item.is_favorite });
                  }}
                  className={`rounded-md border px-2 py-1 text-xs ${item.is_favorite ? 'border-amber-400 text-amber-300' : 'border-zinc-700 text-zinc-300'}`}
                >
                  {item.is_favorite ? '★ Favori' : '☆ Favorile'}
                </button>
                <p className="text-xs text-zinc-400">{new Date(item.created_at).toLocaleString('tr-TR')}</p>
              </div>
            </div>
            <p className="mt-1 text-xs text-zinc-400">{item.agent_runs?.agent_types?.name ?? item.agent_runs?.agent_types?.slug ?? 'Agent'}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">{item.content.length > 260 ? `${item.content.slice(0, 260)}...` : item.content}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(item.tags ?? []).map((tag) => (
                <button
                  key={`${item.id}-${tag}`}
                  type="button"
                  onClick={() => setSearchTerm(tag)}
                  className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300"
                >
                  #{tag}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  const current = (item.tags ?? []).join(', ');
                  const nextTags = window.prompt('Etiketleri virgül ile girin', current);
                  if (nextTags === null) {
                    return;
                  }
                  const parsed = nextTags
                    .split(',')
                    .map((tag) => tag.trim().toLowerCase())
                    .filter((tag, index, all) => tag.length > 0 && all.indexOf(tag) === index)
                    .slice(0, 6);
                  void updateRow(item.id, { tags: parsed });
                }}
                className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300"
              >
                + etiket
              </button>
              {item.project_name ? <span className="rounded-full border border-indigo-500/40 px-2 py-0.5 text-xs text-indigo-200">Proje: {item.project_name}</span> : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => {
                void handleCopy(item.id, item.content);
              }} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-500 hover:text-white">
                {copiedId === item.id ? 'Kopyalandı ✓' : 'Kopyala'}
              </button>
              <button type="button" onClick={() => setActiveModalRow(item)} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-500 hover:text-white">
                Tamamını Gör
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextProject = window.prompt('Proje adı girin (boş bırakırsanız projeden ayrılır)', item.project_name ?? '');
                  if (nextProject === null) {
                    return;
                  }
                  void updateRow(item.id, { project_name: nextProject.trim() || null });
                }}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-500 hover:text-white"
              >
                {item.project_name ? 'Projeyi Değiştir' : 'Projeye Taşı'}
              </button>
              {item.agent_runs?.agent_types?.slug ? (
                <Link href={`/agents/${item.agent_runs.agent_types.slug}?prompt=${encodeURIComponent(item.agent_runs.user_input)}&source=saved-rerun`} className="rounded-md border border-emerald-700/80 px-3 py-1.5 text-xs text-emerald-200 hover:border-emerald-500 hover:text-emerald-100">
                  Aynı Prompt ile Yeniden Çalıştır
                </Link>
              ) : null}
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
          <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/50 p-4 text-sm text-zinc-300">
            Kayıtlı çıktı yok. Bir agent çalıştırıp sonucu kaydettiğinizde burada arama, etiket ve proje yönetimi yapabilirsiniz.
          </p>
        ) : null}
      </div>

      {activeModalRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 px-4 py-8" onClick={() => setActiveModalRow(null)} role="presentation">
          <div className="flex max-h-full w-full max-w-3xl flex-col rounded-2xl border border-zinc-800 bg-zinc-900" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Kaydedilmiş çıktı detayı">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <h2 className="text-base font-semibold text-zinc-100">{activeModalRow.title || 'Başlıksız çıktı'}</h2>
              <button type="button" className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:border-zinc-500 hover:text-white" onClick={() => setActiveModalRow(null)}>
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

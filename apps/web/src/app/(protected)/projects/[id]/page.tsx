'use client';

import { useEffect, useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';
import { resolveWorkspaceContext } from '@/lib/workspace';

type ProjectDetail = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

type ProjectItem = {
  id: string;
  title: string;
  item_type: string;
  content: string;
  created_at: string;
};

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeItem, setActiveItem] = useState<ProjectItem | null>(null);

  useEffect(() => {
    async function loadProjectDetail() {
      try {
        setLoading(true);
        const supabase = createBrowserSupabase();
        const { workspace, user } = await resolveWorkspaceContext(supabase);

        const [{ data: projectData, error: projectError }, { data: itemData, error: itemsError }] = await Promise.all([
          supabase
            .from('projects')
            .select('id, name, description, created_at')
            .eq('id', params.id)
            .eq('workspace_id', workspace.id)
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('project_items')
            .select('id, title, item_type, content, created_at')
            .eq('project_id', params.id)
            .eq('workspace_id', workspace.id)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        ]);

        if (projectError || itemsError) {
          setError(projectError?.message ?? itemsError?.message ?? 'Proje detayları yüklenemedi.');
          return;
        }

        if (!projectData) {
          setError('Proje bulunamadı.');
          return;
        }

        setProject(projectData as ProjectDetail);
        setItems((itemData ?? []) as ProjectItem[]);
      } catch (loadErr) {
        setError(loadErr instanceof Error ? loadErr.message : 'Proje detayı yüklenemedi.');
      } finally {
        setLoading(false);
      }
    }

    void loadProjectDetail();
  }, [params.id]);

  if (loading) {
    return <p className="text-sm text-zinc-300">Proje yükleniyor...</p>;
  }

  if (error && !project) {
    return <p className="text-sm text-rose-300">{error}</p>;
  }

  if (!project) {
    return <p className="text-sm text-zinc-300">Proje bulunamadı.</p>;
  }

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <p className="text-sm text-zinc-300">{project.description || 'Açıklama yok.'}</p>
      </header>

      {error ? <p className="rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p> : null}

      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-medium text-zinc-100">{item.title}</h2>
              <span className="text-xs text-zinc-400">{new Date(item.created_at).toLocaleString('tr-TR')}</span>
            </div>
            <p className="mt-1 text-xs uppercase text-zinc-400">Tip: {item.item_type}</p>
            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-300">{item.content}</p>
            <button
              type="button"
              onClick={() => setActiveItem(item)}
              className="mt-3 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-500 hover:text-white"
            >
              Tamamını Oku
            </button>
          </article>
        ))}

        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-4 text-sm text-zinc-300">
            Bu projede henüz öğe yok. Kayıtlı çıktılar sayfasından “Projeye ekle” ile içerik ekleyebilirsin.
          </p>
        ) : null}
      </div>

      {activeItem ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 px-4 py-8"
          onClick={() => setActiveItem(null)}
          role="presentation"
        >
          <div
            className="flex max-h-full w-full max-w-3xl flex-col rounded-2xl border border-zinc-800 bg-zinc-900"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Proje öğesi detayı"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <h2 className="text-base font-semibold text-zinc-100">{activeItem.title}</h2>
              <button
                type="button"
                className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:border-zinc-500 hover:text-white"
                onClick={() => setActiveItem(null)}
              >
                X
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-3">
              <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">{activeItem.content}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

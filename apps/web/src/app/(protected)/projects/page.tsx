'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ApiRequestError, postJsonWithSession } from '@/lib/api-client';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { resolveWorkspaceContext } from '@/lib/workspace';

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  project_items: { count: number }[];
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProjects() {
      try {
        setLoading(true);
        const supabase = createBrowserSupabase();
        const { workspace, user } = await resolveWorkspaceContext(supabase);

        const { data, error: loadError } = await supabase
          .from('projects')
          .select('id, name, description, created_at, project_items(count)')
          .eq('workspace_id', workspace.id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (loadError) {
          setError(loadError.message);
          return;
        }

        setProjects((data ?? []) as ProjectRow[]);
      } catch (loadErr) {
        setError(loadErr instanceof Error ? loadErr.message : 'Projeler yüklenemedi.');
      } finally {
        setLoading(false);
      }
    }

    void loadProjects();
  }, []);

  async function onCreateProject() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Proje adı zorunludur.');
      return;
    }

    try {
      setCreating(true);
      setError('');
      const response = await postJsonWithSession<{ project: Omit<ProjectRow, 'project_items'> }, { name: string; description?: string }>(
        '/api/projects',
        {
          name: trimmedName,
          description: description.trim() || undefined,
        },
      );

      setProjects((current) => [{ ...response.project, project_items: [{ count: 0 }] }, ...current]);
      setName('');
      setDescription('');
    } catch (createErr) {
      if (createErr instanceof ApiRequestError) {
        setError(createErr.message);
        return;
      }

      setError(createErr instanceof Error ? createErr.message : 'Proje oluşturulamadı.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Projeler</h1>
        <p className="text-zinc-300">Kaydettiğin çıktıları projelere ekleyerek üretim akışını düzenle.</p>
      </header>

      {error ? <p className="rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p> : null}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
        <h2 className="text-sm font-medium text-zinc-100">Yeni proje oluştur</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-[2fr_3fr_auto]">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Proje adı"
            maxLength={80}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ring-indigo-400 focus:ring"
          />
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Kısa açıklama (opsiyonel)"
            maxLength={200}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ring-indigo-400 focus:ring"
          />
          <button
            type="button"
            onClick={() => {
              void onCreateProject();
            }}
            disabled={creating}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {creating ? 'Oluşturuluyor...' : 'Proje Oluştur'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? <p className="text-sm text-zinc-400">Projeler yükleniyor...</p> : null}

        {projects.map((project) => (
          <article key={project.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-medium text-zinc-100">{project.name}</h3>
              <span className="text-xs text-zinc-400">{new Date(project.created_at).toLocaleString('tr-TR')}</span>
            </div>
            {project.description ? <p className="mt-2 text-sm text-zinc-300">{project.description}</p> : null}
            <p className="mt-2 text-xs text-zinc-400">Öğe sayısı: {project.project_items[0]?.count ?? 0}</p>
            <Link href={`/projects/${project.id}`} className="mt-3 inline-block text-sm text-indigo-300 hover:text-indigo-200">
              Projeyi Aç
            </Link>
          </article>
        ))}

        {!loading && projects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-4 text-sm text-zinc-300">
            Henüz proje yok. İlk projeni oluştur ve kaydettiğin çıktıları eklemeye başla.
          </p>
        ) : null}
      </div>
    </section>
  );
}

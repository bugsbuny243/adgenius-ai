'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';
import { resolveWorkspaceContext } from '@/lib/workspace';

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [workspaceRole, setWorkspaceRole] = useState<'owner' | 'admin' | 'member'>('member');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserSupabase();
        const { workspace, role } = await resolveWorkspaceContext(supabase);
        setWorkspaceId(workspace.id);
        setWorkspaceRole(role);

        const { data, error: loadError } = await supabase
          .from('projects')
          .select('id, name, description, created_at, created_by')
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false });

        if (loadError) {
          setError(loadError.message);
          return;
        }

        setProjects((data ?? []) as ProjectRow[]);

      } catch (loadErr) {
        setError(loadErr instanceof Error ? loadErr.message : 'Projeler yüklenemedi.');
      }
    }

    void load();
  }, []);

  async function createProject() {
    if (!workspaceId || !name.trim()) {
      return;
    }

    try {
      const supabase = createBrowserSupabase();
      const { user } = await resolveWorkspaceContext(supabase);
      const { data, error: insertError } = await supabase
        .from('projects')
        .insert({
          workspace_id: workspaceId,
          created_by: user.id,
          name: name.trim(),
          description: description.trim() || null,
        })
        .select('id, name, description, created_at, created_by')
        .single();

      if (insertError || !data) {
        setError(insertError?.message ?? 'Proje oluşturulamadı.');
        return;
      }

      await supabase.from('activity_logs').insert({
        workspace_id: workspaceId,
        project_id: data.id,
        actor_user_id: user.id,
        event_type: 'project_created',
        metadata: { project_name: data.name },
      });

      setProjects((current) => [data as ProjectRow, ...current]);
      setName('');
      setDescription('');
      setError('');
    } catch {
      setError('Proje oluşturulamadı.');
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Projeler</h1>
        <p className="text-sm text-zinc-400">Workspace içindeki tüm projeler ekip tarafından görüntülenebilir.</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <p className="mb-3 text-xs text-zinc-400">Rolün: {workspaceRole}</p>
        <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Proje adı"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          />
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Açıklama (opsiyonel)"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          />
          <button onClick={() => void createProject()} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm hover:bg-indigo-400">
            Proje oluştur
          </button>
        </div>
      </div>

      {error ? <p className="rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p> : null}

      <div className="space-y-3">
        {projects.map((project) => (
          <article key={project.id} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium text-zinc-100">{project.name}</p>
                <p className="text-xs text-zinc-400">{project.description || 'Açıklama yok'}</p>
              </div>
              <Link href={`/projects/${project.id}`} className="rounded-md border border-zinc-700 px-3 py-1 text-xs hover:border-indigo-400">
                Detaya git
              </Link>
            </div>
            <p className="mt-2 text-xs text-zinc-500">{new Date(project.created_at).toLocaleString('tr-TR')}</p>
          </article>
        ))}

        {projects.length === 0 ? <p className="text-sm text-zinc-400">Henüz proje yok.</p> : null}
      </div>
    </section>
  );
}

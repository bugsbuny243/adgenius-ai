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

type ProfileMap = Record<string, { full_name: string | null; email: string | null }>;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');

  async function loadProjects() {
    const supabase = createBrowserSupabase();
    const { workspace } = await resolveWorkspaceContext(supabase);

    const { data, error } = await supabase
      .from('projects')
      .select('id, name, description, created_at, created_by')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false });

    if (error) {
      setStatus(`Projeler yüklenemedi: ${error.message}`);
      return;
    }

    const rows = (data ?? []) as ProjectRow[];
    setProjects(rows);

    const uniqueAuthors = [...new Set(rows.map((row) => row.created_by))];
    if (uniqueAuthors.length > 0) {
      const { data: profileRows } = await supabase.from('profiles').select('id, full_name, email').in('id', uniqueAuthors);
      const nextMap: ProfileMap = {};
      (profileRows ?? []).forEach((profile) => {
        nextMap[profile.id] = {
          full_name: profile.full_name,
          email: profile.email,
        };
      });
      setProfiles(nextMap);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  async function onCreateProject() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setStatus('Proje adı zorunludur.');
      return;
    }

    const supabase = createBrowserSupabase();
    const { user, workspace } = await resolveWorkspaceContext(supabase);

    const { error } = await supabase.from('projects').insert({
      workspace_id: workspace.id,
      name: trimmedName,
      description: description.trim() || null,
      created_by: user.id,
    });

    if (error) {
      setStatus(`Proje oluşturulamadı: ${error.message}`);
      return;
    }

    setName('');
    setDescription('');
    setStatus('Proje oluşturuldu.');
    await loadProjects();
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Projeler</h1>
        <p className="text-zinc-300">Workspace içindeki tüm projeler ekip üyeleri tarafından görüntülenebilir.</p>
      </header>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
        <h2 className="mb-3 text-lg font-medium">Yeni proje</h2>
        <div className="grid gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Proje adı"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Proje açıklaması (opsiyonel)"
            className="min-h-20 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void onCreateProject()}
            className="w-fit rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400"
          >
            Proje oluştur
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {projects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`} className="block rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 hover:border-indigo-500/40">
            <p className="text-sm font-medium">{project.name}</p>
            <p className="mt-1 text-xs text-zinc-400">{project.description ?? 'Açıklama yok.'}</p>
            <p className="mt-2 text-xs text-zinc-500">
              Oluşturan: {profiles[project.created_by]?.full_name ?? profiles[project.created_by]?.email ?? project.created_by} ·{' '}
              {new Date(project.created_at).toLocaleString('tr-TR')}
            </p>
          </Link>
        ))}
      </div>

      {status ? <p className="text-sm text-zinc-300">{status}</p> : null}
    </section>
  );
}

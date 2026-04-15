import Link from 'next/link';
import { Nav } from '@/components/nav';
import { getAppContextOrRedirect } from '@/lib/app-context';
import { createProjectAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const { supabase, workspace, userId } = await getAppContextOrRedirect();

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, description, created_at')
    .eq('workspace_id', workspace.workspaceId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return (
    <main>
      <Nav />

      <section className="panel mb-4">
        <h2 className="mb-4 text-2xl font-semibold">Projeler</h2>
        <form action={createProjectAction} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
          <input name="name" required placeholder="Proje adı" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
          <input name="description" placeholder="Kısa açıklama" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
          <button type="submit" className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink">
            Oluştur
          </button>
        </form>
      </section>

      <section className="panel">
        {error ? (
          <p className="text-sm text-red-300">Projeler yüklenemedi: {error.message}</p>
        ) : projects && projects.length > 0 ? (
          <div className="space-y-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="block rounded-xl border border-white/10 px-4 py-3">
                <p className="font-medium">{project.name}</p>
                <p className="text-sm text-white/60">{project.description || 'Açıklama yok.'}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/70">Henüz proje yok.</p>
        )}
      </section>
    </main>
  );
}

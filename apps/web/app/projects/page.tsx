import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';
import { createProjectAction } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProjectsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { workspaceId, userId } = await getWorkspaceContext();

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, description, status, created_at')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load projects: ${error.message}`);
  }

  return (
    <main>
      <Nav />

      <section className="panel mb-4">
        <h2 className="mb-4 text-2xl font-semibold">Projects</h2>
        <form action={createProjectAction} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
          <input
            name="name"
            required
            placeholder="Project name"
            className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
          />
          <input
            name="description"
            placeholder="Short description"
            className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
          />
          <button type="submit" className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink">
            Create
          </button>
        </form>
      </section>

      <section className="panel">
        {projects && projects.length > 0 ? (
          <div className="space-y-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="block rounded-xl border border-white/10 px-4 py-3">
                <p className="font-medium">{project.name}</p>
                <p className="text-sm text-white/60">{project.description || 'No description yet.'}</p>
                <p className="text-xs text-white/50">Status: {project.status}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/70">No projects yet. Create your first project above.</p>
        )}
      </section>
    </main>
  );
}

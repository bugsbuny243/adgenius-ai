import { ArrowUpRight, Ghost } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';
import { getWorkspaceContextOrNull } from '@/lib/workspace';

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function toTurkishDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('tr-TR');
}

export default async function DashboardPage() {
  const supabase = await createSupabaseReadonlyServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  const workspace = await getWorkspaceContextOrNull();
  if (!workspace) redirect('/signin');

  const [projectsRes] = await Promise.all([
    supabase.from('game_projects').select('id, name, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8)
  ]);
  const projects = projectsRes.data ?? [];

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-black to-black" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:52px_52px] opacity-20" />

      <section className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
        <Nav />
        <div className="flex-1 space-y-6">
          <section className="rounded-2xl border border-white/5 bg-zinc-900/40 p-7 backdrop-blur-xl shadow-[0_0_30px_-10px_rgba(139,92,246,0.2)]">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">Workspace Active</p>
                <h2 className="mt-4 bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-4xl font-semibold tracking-tight text-transparent">{workspace.workspaceName}</h2>
                <p className="mt-2 text-zinc-500">Real-time build intelligence and release orchestration.</p>
              </div>
              <Link href="/game-factory" className="inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_0_22px_-8px_rgba(139,92,246,0.8)] transition hover:brightness-110">Create Project <ArrowUpRight className="h-4 w-4" /></Link>
            </div>
          </section>

          <section className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold tracking-tight text-zinc-100">Recent Build Pipelines</h3>
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">{projects.length} Total</span>
            </div>

            <div className="space-y-3">
              {projects.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-black/40 p-10 text-center">
                  <Ghost className="mx-auto h-10 w-10 text-zinc-600" />
                  <p className="mt-3 text-sm text-zinc-500">No projects yet. Start your first autonomous build flow.</p>
                  <Link href="/game-factory/new" className="mt-4 inline-flex rounded-xl border border-violet-500/30 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_0_22px_-8px_rgba(139,92,246,0.8)]">Create New</Link>
                </div>
              ) : (
                projects.map((project) => (
                  <article key={project.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black/40 px-4 py-3">
                    <div>
                      <p className="tracking-tight text-zinc-100">{project.name}</p>
                      <p className="text-xs text-zinc-500">{toTurkishDate(project.created_at)}</p>
                    </div>
                    <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">{project.status ?? 'processing'}</span>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';
import { getWorkspaceContextOrNull } from '@/lib/workspace';

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function toTurkishDate(value: string | null | undefined): string { if (!value) return '—'; return new Date(value).toLocaleDateString('tr-TR'); }

export default async function DashboardPage() {
  const supabase = await createSupabaseReadonlyServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  const workspace = await getWorkspaceContextOrNull();
  if (!workspace) redirect('/signin');

  const [projectsRes] = await Promise.all([
    supabase.from('game_projects').select('id, name, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8)
  ]);
  const projects = projectsRes.data ?? [];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <section className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 lg:flex-row">
        <Nav />
        <div className="flex-1 space-y-6">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.2em] text-violet-300">Unity Build Mission Control</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">{workspace.workspaceName}</h2>
            <p className="mt-2 text-zinc-400">Canlı build durumları ve son üretim projeleri.</p>
            <Link href="/game-factory" className="mt-4 inline-flex rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-105">Yeni Proje</Link>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold tracking-tight">Unity Build Durumları</h3>
              <span className="text-xs text-zinc-400">Toplam: {projects.length}</span>
            </div>
            <div className="space-y-3">
              {projects.length === 0 ? <p className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 text-sm text-zinc-400">Henüz proje bulunmuyor.</p> : projects.map((project) => (
                <article key={project.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
                  <div>
                    <p className="font-semibold">{project.name}</p>
                    <p className="text-xs text-zinc-400">{toTurkishDate(project.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-violet-500" />
                    </span>
                    {project.status ?? 'processing'}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

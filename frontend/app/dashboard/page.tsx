import { ArrowUpRight, Ghost, Zap, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';
import { getWorkspaceContextOrNull } from '@/lib/workspace';
import { MultiplayerServerModule } from '@/components/multiplayer-server-module';

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function toTurkishDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('tr-TR');
}

function getStatusIcon(status: string | null | undefined) {
  const s = String(status ?? '').toLowerCase();
  if (s.includes('success') || s.includes('succeeded')) return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (s.includes('failed')) return <AlertCircle className="h-4 w-4 text-red-400" />;
  return <Zap className="h-4 w-4 text-amber-400" />;
}

function getStatusColor(status: string | null | undefined): string {
  const s = String(status ?? '').toLowerCase();
  if (s.includes('success') || s.includes('succeeded')) return 'text-emerald-300';
  if (s.includes('failed')) return 'text-red-300';
  return 'text-amber-300';
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

  const activeBuilds = projects.filter(p => !String(p.status).includes('succeeded') && !String(p.status).includes('failed')).length;
  const activePlayers = Math.max(activeBuilds * 12, projects.length > 0 ? 4 : 0);
  const isServerOnline = activeBuilds > 0 || projects.length > 0;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-zinc-950 to-zinc-950" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:14px_24px]" />

      <section className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
        <Nav />
        <div className="flex-1 space-y-6">
          {/* Welcome Section */}
          <section className="rounded-2xl border border-white/5 bg-gradient-to-br from-zinc-900/50 to-zinc-900/30 p-7 backdrop-blur-xl shadow-[0_0_30px_-10px_rgba(139,92,246,0.2)]">
            <div className="mb-5 flex items-start justify-between">
              <div className="flex-1">
                <p className="inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">🚀 Workspace Active</p>
                <h2 className="mt-4 bg-gradient-to-r from-white via-white to-zinc-500 bg-clip-text text-4xl font-semibold tracking-tight text-transparent">{workspace.workspaceName}</h2>
                <p className="mt-2 text-zinc-500">Real-time build intelligence and release orchestration.</p>
              </div>
              <Link href="/game-factory" className="inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:border-violet-500/50 hover:shadow-[0_0_20px_-5px_rgba(139,92,246,0.3)] whitespace-nowrap">
                <Zap className="h-4 w-4" />
                New Game
              </Link>
            </div>

            {/* Stats Grid */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-white/5 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Total Projects</p>
                <p className="mt-2 text-2xl font-semibold text-white">{projects.length}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Success Rate</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-300">
                  {projects.length > 0 ? `${Math.round((projects.filter(p => String(p.status).includes('succeeded')).length / projects.length) * 100)}%` : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Active Builds</p>
                <p className="mt-2 text-2xl font-semibold text-amber-300">
                  {activeBuilds}
                </p>
              </div>
            </div>
          </section>

          <MultiplayerServerModule activePlayers={activePlayers} isOnline={isServerOnline} />

          {/* Recent Build Pipelines */}
          <section className="rounded-2xl border border-white/5 bg-zinc-900/50 p-6 backdrop-blur-xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-violet-400" />
                <h3 className="text-xl font-semibold tracking-tight text-zinc-100">Recent Build Pipelines</h3>
              </div>
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">{projects.length} Total</span>
            </div>

            <div className="space-y-3">
              {projects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/20 p-12 text-center">
                  <Ghost className="mx-auto h-12 w-12 text-zinc-600" />
                  <p className="mt-4 text-sm font-medium text-zinc-400">No projects yet</p>
                  <p className="mt-1 text-xs text-zinc-600">Start your first autonomous build flow to see projects here.</p>
                  <Link href="/game-factory/new" className="mt-6 inline-flex rounded-xl border border-violet-500/30 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:border-violet-500/50 hover:shadow-[0_0_20px_-5px_rgba(139,92,246,0.3)]">
                    <Zap className="mr-2 h-4 w-4" />
                    Create First Game
                  </Link>
                </div>
              ) : (
                projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/game-factory/${project.id}`}
                    className="group rounded-xl border border-zinc-800/50 bg-zinc-900/30 px-4 py-3 transition hover:border-violet-500/30 hover:bg-zinc-900/50 hover:shadow-[0_0_15px_-5px_rgba(139,92,246,0.2)]"
                  >
                    <article className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="tracking-tight text-zinc-100 font-medium group-hover:text-white transition">{project.name}</p>
                            <p className="text-xs text-zinc-500">Created {toTurkishDate(project.created_at)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 rounded-full border border-current/30 bg-current/10 px-3 py-1 text-xs font-medium ${getStatusColor(project.status)}`}>
                          {getStatusIcon(project.status)}
                          <span className="capitalize">{String(project.status ?? 'processing').replace(/_/g, ' ')}</span>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition" />
                      </div>
                    </article>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* Quick Actions */}
          <section className="rounded-2xl border border-white/5 bg-zinc-900/50 p-6 backdrop-blur-xl">
            <h3 className="mb-4 text-lg font-semibold text-zinc-100">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Link href="/game-factory/new" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center transition hover:border-violet-500/30 hover:bg-zinc-900/70">
                <Zap className="mx-auto h-5 w-5 text-violet-400 mb-2" />
                <p className="text-xs font-medium text-zinc-300">New Game</p>
              </Link>
              <Link href="/settings" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center transition hover:border-violet-500/30 hover:bg-zinc-900/70">
                <Zap className="mx-auto h-5 w-5 text-amber-400 mb-2" />
                <p className="text-xs font-medium text-zinc-300">Settings</p>
              </Link>
              <Link href="/game-factory" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center transition hover:border-violet-500/30 hover:bg-zinc-900/70">
                <TrendingUp className="mx-auto h-5 w-5 text-emerald-400 mb-2" />
                <p className="text-xs font-medium text-zinc-300">All Projects</p>
              </Link>
              <Link href="/pricing" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center transition hover:border-violet-500/30 hover:bg-zinc-900/70">
                <ArrowUpRight className="mx-auto h-5 w-5 text-cyan-400 mb-2" />
                <p className="text-xs font-medium text-zinc-300">Upgrade</p>
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

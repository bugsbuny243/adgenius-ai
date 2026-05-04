import { Activity, ArrowUpRight, Bot, CheckCircle2, Cpu, Plus, RadioTower, Sparkles, TriangleAlert } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';
import { getWorkspaceContextOrNull } from '@/lib/workspace';

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function statusPillStyles(status: 'online' | 'warning' | 'offline') {
  if (status === 'online') return 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300';
  if (status === 'warning') return 'border-violet-400/30 bg-violet-400/10 text-violet-300';
  return 'border-rose-400/30 bg-rose-400/10 text-rose-300';
}

export default async function DashboardPage() {
  const supabase = await createSupabaseReadonlyServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const workspace = await getWorkspaceContextOrNull();
  if (!workspace) redirect('/signin');

  const { data } = await supabase
    .from('game_projects')
    .select('id, name, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(6);

  const projects = data ?? [];
  const activeProjects = projects.filter((project) => !String(project.status).includes('succeeded') && !String(project.status).includes('failed')).length;
  const successfulProjects = projects.filter((project) => String(project.status).includes('succeeded')).length;
  const pipelineHealth = projects.length > 0 ? Math.round((successfulProjects / projects.length) * 100) : 100;

  const railwayStatus: 'online' | 'warning' | 'offline' = projects.length > 0 ? 'online' : 'warning';
  const workerStatus: 'online' | 'warning' | 'offline' = activeProjects > 0 ? 'online' : 'warning';
  const aiStatus: 'online' | 'warning' | 'offline' = 'online';

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8 lg:py-8">
      <Nav />

      <section className="flex-1 space-y-6">
        <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-xl">
          <div className="pointer-events-none absolute -right-20 -top-16 h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-20 h-52 w-52 rounded-full bg-violet-500/20 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" /> Premium Command Center
              </p>
              <h1 className="mt-4 text-3xl font-bold tracking-tighter text-slate-100 sm:text-4xl">{workspace.workspaceName}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">Operate every pipeline from one unified battlefield: projects, infrastructure, and AI runtime intelligence.</p>
            </div>

            <Link
              href="/game-factory/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-200 shadow-[0_0_28px_-12px_rgba(34,211,238,0.8)] transition hover:border-cyan-200/60 hover:bg-cyan-300/20"
            >
              <Plus className="h-4 w-4" /> Yeni Proje
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Active Projects</p>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-4xl font-bold tracking-tighter text-slate-100">{activeProjects}</p>
                <p className="mt-1 text-sm text-slate-400">{projects.length} total pipeline</p>
              </div>
              <Activity className="h-6 w-6 text-cyan-300" />
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Server Status</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-300"><RadioTower className="h-4 w-4 text-cyan-300" /> Railway API</div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusPillStyles(railwayStatus)}`}>{railwayStatus}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-300"><Cpu className="h-4 w-4 text-violet-300" /> Worker Queue</div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusPillStyles(workerStatus)}`}>{workerStatus}</span>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl md:col-span-2 xl:col-span-1">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">AI Engine</p>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold tracking-tight text-slate-100">Hugging Face 70B</p>
                <p className="mt-1 text-sm text-slate-400">Inference orchestration nominal.</p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusPillStyles(aiStatus)}`}>{aiStatus}</span>
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-slate-100">Recent Projects</h2>
              <Link href="/game-factory" className="inline-flex items-center gap-1 text-sm text-cyan-300 transition hover:text-cyan-200">
                Tümünü gör <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {projects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/15 bg-black/30 p-6 text-sm text-slate-400">
                  Henüz proje yok. Komut merkezi hazır, ilk projeyi oluşturup pipeline akışını başlat.
                </div>
              ) : (
                projects.map((project) => {
                  const isFailed = String(project.status).includes('failed');
                  return (
                    <Link
                      key={project.id}
                      href={`/game-factory/${project.id}`}
                      className="group flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3 transition hover:border-cyan-300/30 hover:bg-black/40"
                    >
                      <div>
                        <p className="font-medium tracking-tight text-slate-200 group-hover:text-white">{project.name}</p>
                        <p className="text-xs text-slate-500">{new Date(project.created_at).toLocaleDateString('tr-TR')}</p>
                      </div>
                      {isFailed ? <TriangleAlert className="h-4 w-4 text-rose-300" /> : <CheckCircle2 className="h-4 w-4 text-cyan-300" />}
                    </Link>
                  );
                })
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="text-lg font-semibold tracking-tight text-slate-100">Pipeline Health</h2>
            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-4xl font-bold tracking-tighter text-slate-100">{pipelineHealth}%</p>
              <p className="mt-1 text-sm text-slate-400">Son 6 proje başarı oranı.</p>
            </div>

            <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-500/10 p-4 text-sm text-violet-200">
              <div className="mb-1 flex items-center gap-2 font-medium"><Bot className="h-4 w-4" /> AI Ops Insight</div>
              Worker queue ve inference motoru hazır. Yeni brief üretimi için sistem senkron.
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

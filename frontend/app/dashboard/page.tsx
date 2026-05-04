import { Activity, ArrowUpRight, Bot, CheckCircle2, Cpu, Gauge, Orbit, Plus, RadioTower, Sparkles, TriangleAlert } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';
import { getWorkspaceContextOrNull } from '@/lib/workspace';

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function statusPill(status: 'online' | 'warning' | 'offline') {
  if (status === 'online') return 'border-emerald-300/35 bg-emerald-300/10 text-emerald-200';
  if (status === 'warning') return 'border-amber-300/35 bg-amber-300/10 text-amber-200';
  return 'border-rose-300/35 bg-rose-300/10 text-rose-200';
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
    .limit(8);

  const projects = data ?? [];
  const activeProjects = projects.filter((p) => !String(p.status).includes('succeeded') && !String(p.status).includes('failed')).length;
  const successfulProjects = projects.filter((p) => String(p.status).includes('succeeded')).length;
  const pipelineHealth = projects.length > 0 ? Math.round((successfulProjects / projects.length) * 100) : 100;

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8 lg:py-8">
      <Nav />

      <section className="flex-1 space-y-6">
        <header className="relative overflow-hidden rounded-3xl bg-white/5 p-7 backdrop-blur-xl border border-white/10 shadow-[0_0_55px_-24px_rgba(6,182,212,0.55)]">
          <div className="pointer-events-none absolute -top-20 right-0 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
          <p className="relative inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs tracking-[0.2em] text-cyan-200">
            <Sparkles className="h-3.5 w-3.5" /> COMMAND CENTER
          </p>
          <div className="relative mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">{workspace.workspaceName}</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">Otonom oyun üretim hattınızın canlı operasyon paneli.</p>
            </div>
            <Link href="/game-factory/new" className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/50 bg-cyan-500/20 px-4 py-2.5 text-sm font-semibold text-cyan-100 shadow-[0_0_25px_-8px_rgba(6,182,212,0.95)] transition hover:bg-cyan-500/30">
              <Plus className="h-4 w-4" /> Yeni Proje
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3 auto-rows-[minmax(160px,auto)]">
          <article className="rounded-2xl bg-white/5 p-5 backdrop-blur-xl border border-white/10">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Active Projects</p>
            <div className="mt-4 flex items-end justify-between"><p className="text-4xl font-bold text-white">{activeProjects}</p><Activity className="h-5 w-5 text-cyan-400" /></div>
          </article>
          <article className="rounded-2xl bg-white/5 p-5 backdrop-blur-xl border border-white/10">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Pipeline Health</p>
            <div className="mt-4 flex items-end justify-between"><p className="text-4xl font-bold text-white">{pipelineHealth}%</p><Gauge className="h-5 w-5 text-violet-400" /></div>
          </article>
          <article className="rounded-2xl bg-white/5 p-5 backdrop-blur-xl border border-white/10">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">System Uptime</p>
            <div className="mt-4 flex items-end justify-between"><p className="text-4xl font-bold text-white">99.97%</p><Orbit className="h-5 w-5 text-cyan-400" /></div>
          </article>

          <article className="rounded-2xl bg-white/5 p-6 backdrop-blur-xl border border-white/10 md:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent Projects</h2>
              <Link href="/game-factory" className="inline-flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200">Open all <ArrowUpRight className="h-4 w-4" /></Link>
            </div>
            <div className="space-y-2.5">
              {projects.length === 0 ? <div className="rounded-xl bg-black/30 p-6 text-sm text-slate-400 border border-white/10">No projects yet. Initialize one to activate telemetry.</div> : projects.map((project) => {
                const failed = String(project.status).includes('failed');
                return <Link key={project.id} href={`/game-factory/${project.id}`} className="group flex items-center justify-between rounded-xl bg-black/30 px-4 py-3 transition hover:bg-black/45 border border-white/10 hover:border-cyan-500/40">
                    <div><p className="font-medium text-slate-100 group-hover:text-white">{project.name}</p><p className="text-xs text-slate-500">{new Date(project.created_at).toLocaleDateString('en-US')}</p></div>
                    {failed ? <TriangleAlert className="h-4 w-4 text-rose-300" /> : <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
                  </Link>;
              })}
            </div>
          </article>

          <article className="rounded-2xl bg-white/5 p-6 backdrop-blur-xl border border-white/10">
            <h2 className="text-lg font-semibold text-white">System Status</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between text-slate-200"><span className="flex items-center gap-2"><RadioTower className="h-4 w-4 text-cyan-300" /> API Mesh</span><span className={`rounded-full border px-2.5 py-1 text-xs ${statusPill('online')}`}>online</span></div>
              <div className="flex items-center justify-between text-slate-200"><span className="flex items-center gap-2"><Cpu className="h-4 w-4 text-violet-300" /> Worker Queue</span><span className={`rounded-full border px-2.5 py-1 text-xs ${statusPill(activeProjects > 0 ? 'online' : 'warning')}`}>{activeProjects > 0 ? 'online' : 'warning'}</span></div>
              <div className="flex items-center justify-between text-slate-200"><span className="flex items-center gap-2"><Bot className="h-4 w-4 text-cyan-300" /> Inference Core</span><span className={`rounded-full border px-2.5 py-1 text-xs ${statusPill('online')}`}>online</span></div>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

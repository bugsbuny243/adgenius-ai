import { Activity, Bot, Cpu, RadioTower } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';
import { getWorkspaceContextOrNull } from '@/lib/workspace';

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = await createSupabaseReadonlyServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const workspace = await getWorkspaceContextOrNull();
  if (!workspace) redirect('/signin');

  const { count } = await supabase.from('game_projects').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
  const activeProjects = count ?? 0;

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 bg-[#020617] px-4 py-6 sm:px-6 lg:flex-row lg:px-8 lg:py-8">
      <Nav />

      <section className="flex-1 space-y-6">
        <header className="rounded-3xl bg-white/5 p-8 backdrop-blur-xl border border-white/10 shadow-[0_0_44px_-16px_rgba(139,92,246,0.6)]">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Command Center</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">{workspace.workspaceName}</h1>
          <p className="mt-3 max-w-2xl text-slate-300">KOSCHEI V5 üretim telemetrisi, model koordinasyonu ve proje takibi tek bakışta.</p>
          <Link
            href="/game-factory/new"
            className="mt-6 inline-flex rounded-xl border border-cyan-300/40 bg-gradient-to-r from-cyan-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_34px_-10px_rgba(6,182,212,0.9)]"
          >
            New Brief
          </Link>
        </header>

        <section className="grid auto-rows-[minmax(140px,auto)] grid-cols-1 gap-4 md:grid-cols-6">
          <article className="md:col-span-2 rounded-2xl bg-white/5 p-5 backdrop-blur-xl border border-white/10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-200">Railway Server (Online)</p>
              <RadioTower className="h-5 w-5 text-cyan-300" />
            </div>
            <p className="mt-4 inline-flex rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">Operational</p>
          </article>

          <article className="md:col-span-2 rounded-2xl bg-white/5 p-5 backdrop-blur-xl border border-white/10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-200">Hugging Face 70B Engine</p>
              <Bot className="h-5 w-5 text-violet-300" />
            </div>
            <p className="mt-4 inline-flex rounded-full border border-violet-300/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">Inference Active</p>
          </article>

          <article className="md:col-span-2 rounded-2xl bg-white/5 p-5 backdrop-blur-xl border border-white/10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-200">Active Projects</p>
              <Activity className="h-5 w-5 text-cyan-300" />
            </div>
            <p className="mt-4 text-4xl font-bold text-white">{activeProjects}</p>
          </article>

          <article className="md:col-span-4 rounded-2xl bg-white/5 p-6 backdrop-blur-xl border border-white/10">
            <h2 className="text-xl font-bold text-white">Operations Matrix</h2>
            <p className="mt-3 text-slate-300">Deployment pipeline stable. Queue latency minimal. Model throughput nominal across all generation nodes.</p>
          </article>

          <article className="md:col-span-2 rounded-2xl bg-white/5 p-6 backdrop-blur-xl border border-white/10">
            <div className="flex items-center gap-2 text-slate-200">
              <Cpu className="h-5 w-5 text-violet-300" />
              <h2 className="font-semibold">System Signal</h2>
            </div>
            <p className="mt-4 text-sm text-slate-300">All critical services are synced with cyan/violet priority routing.</p>
          </article>
        </section>
      </section>
    </main>
  );
}

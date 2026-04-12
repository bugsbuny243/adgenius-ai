import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { bootstrapWorkspaceForUser, getWorkspaceContextOrNull } from '@/lib/workspace';
import { addWorkspaceMemoryAction } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) redirect('/signin');

    let workspaceContext = await getWorkspaceContextOrNull();

    if (!workspaceContext) {
      workspaceContext = await bootstrapWorkspaceForUser(user.id, user.email);
    }

    if (!workspaceContext) {
      return (
        <main>
          <Nav />
          <section className="panel">
            <h2 className="text-lg font-semibold">Workspace</h2>
            <p className="mt-2 text-sm text-white/70">
              Workspace yapılandırması henüz tamamlanamadı. Lütfen daha sonra tekrar deneyin.
            </p>
          </section>
        </main>
      );
    }

    const { workspaceId, workspaceName } = workspaceContext;

    const [
      { count: activeAgentsCount },
      { count: projectsCount },
      { count: runsCount },
      { count: savedOutputsCount },
      { data: recentRuns },
      { data: subscription },
      { data: usage },
      { data: workspaceMemory }
    ] = await Promise.all([
      supabase.from('agent_types').select('id', { count: 'exact', head: true }).or(`workspace_id.eq.${workspaceId},workspace_id.is.null`).eq('is_active', true),
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
      supabase.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
      supabase.from('saved_outputs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
      supabase
        .from('agent_runs')
        .select('id, status, model_name, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('subscriptions').select('plan_name, status, run_limit').eq('workspace_id', workspaceId).maybeSingle(),
      supabase.from('usage_counters').select('runs_count').eq('workspace_id', workspaceId).maybeSingle(),
      supabase
        .from('workspace_memory_entries')
        .select('id, entry_type, title, content, created_at')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(8)
    ]);

    return (
      <main>
        <Nav />
        <section className="panel mb-4">
          <h2 className="text-lg font-semibold">Workspace</h2>
          <p className="text-white/70">{workspaceName}</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <article className="panel">
            <h2 className="text-sm text-white/70">Active Agents</h2>
            <p className="mt-2 text-3xl font-semibold">{activeAgentsCount ?? 0}</p>
          </article>
          <article className="panel">
            <h2 className="text-sm text-white/70">Projects</h2>
            <p className="mt-2 text-3xl font-semibold">{projectsCount ?? 0}</p>
          </article>
          <article className="panel">
            <h2 className="text-sm text-white/70">Agent Runs</h2>
            <p className="mt-2 text-3xl font-semibold">{runsCount ?? 0}</p>
          </article>
          <article className="panel">
            <h2 className="text-sm text-white/70">Saved Outputs</h2>
            <p className="mt-2 text-3xl font-semibold">{savedOutputsCount ?? 0}</p>
          </article>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="panel">
            <h3 className="mb-3 text-lg font-semibold">Plan & Usage</h3>
            <p className="text-sm text-white/70">Plan: {subscription?.plan_name ?? 'free'}</p>
            <p className="text-sm text-white/70">Status: {subscription?.status ?? 'active'}</p>
            <p className="text-sm text-white/70">Run limit: {subscription?.run_limit ?? 0}</p>
            <p className="text-sm text-white/70">Current runs: {usage?.runs_count ?? 0}</p>
          </article>

          <article className="panel">
            <h3 className="mb-3 text-lg font-semibold">Recent Runs</h3>
            {recentRuns && recentRuns.length > 0 ? (
              <div className="space-y-2 text-sm">
                {recentRuns.map((run) => (
                  <div key={run.id} className="rounded-lg border border-white/10 px-3 py-2">
                    <p>Status: {run.status}</p>
                    <p className="text-white/70">Model: {run.model_name}</p>
                    <p className="text-white/70">{new Date(run.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/70">No runs yet for this workspace.</p>
            )}
          </article>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="panel">
            <h3 className="mb-3 text-lg font-semibold">Workspace Memory</h3>
            <form action={addWorkspaceMemoryAction} className="space-y-2">
              <input
                name="title"
                required
                placeholder="Memory title"
                className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neon"
              />
              <textarea
                name="content"
                required
                rows={4}
                placeholder="Reusable workspace context"
                className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neon"
              />
              <input
                name="entry_type"
                defaultValue="note"
                placeholder="Type (note, guideline, persona...)"
                className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neon"
              />
              <button type="submit" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-neon">
                Add memory entry
              </button>
            </form>
          </article>

          <article className="panel">
            <h3 className="mb-3 text-lg font-semibold">Active Memory Entries</h3>
            {workspaceMemory && workspaceMemory.length > 0 ? (
              <div className="space-y-2 text-sm">
                {workspaceMemory.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-white/10 px-3 py-2">
                    <p className="font-medium">{entry.title}</p>
                    <p className="text-xs text-white/60">{entry.entry_type}</p>
                    <p className="text-white/75 line-clamp-3">{entry.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/70">No workspace memory entries yet.</p>
            )}
          </article>
        </section>
      </main>
    );
  } catch (error) {
    console.error('[dashboard] failed to render', { error });
    redirect('/signin?error=dashboard_unavailable');
  }
}

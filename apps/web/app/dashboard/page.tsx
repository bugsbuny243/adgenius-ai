import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { workspaceId, workspaceName } = await getWorkspaceContext();

  const [
    { count: activeAgentsCount },
    { count: projectsCount },
    { count: runsCount },
    { count: savedOutputsCount },
    { data: recentRuns },
    { data: subscription },
    { data: usage }
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
    supabase.from('usage_counters').select('runs_count').eq('workspace_id', workspaceId).maybeSingle()
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
    </main>
  );
}

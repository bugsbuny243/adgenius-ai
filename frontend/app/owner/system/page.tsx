import { getOwnerAccessContextOrRedirect } from '@/lib/owner-access';

export default async function OwnerSystemPage() {
  const { supabase, workspaceId } = await getOwnerAccessContextOrRedirect();

  const [queueRes, runRes, healthResponse] = await Promise.all([
    supabase.from('publish_jobs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/health`, { cache: 'no-store' }).catch(() => null)
  ]);

  let healthText = 'health check unavailable';
  if (healthResponse?.ok) {
    const payload = (await healthResponse.json()) as { ok?: boolean };
    healthText = payload.ok ? 'healthy' : 'degraded';
  }

  return (
    <section className="panel">
      <h2 className="text-lg font-semibold">System status</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
        <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Health: {healthText}</p>
        <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Queue entries: {queueRes.count ?? 0}</p>
        <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Agent runs: {runRes.count ?? 0}</p>
      </div>
      <p className="mt-3 text-xs text-white/60">Provider secrets and integration keys remain server-side and are not rendered in this panel.</p>
    </section>
  );
}

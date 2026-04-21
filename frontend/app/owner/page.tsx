import Link from 'next/link';
import { getOwnerAccessContextOrRedirect } from '@/lib/owner-access';

export default async function OwnerOverviewPage() {
  const { supabase, workspaceId } = await getOwnerAccessContextOrRedirect();

  const [adsRes, paymentsRes, usersRes, projectsRes] = await Promise.all([
    supabase.from('ad_placements').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('payments').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('workspace_members').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId)
  ]);

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="panel">
        <h2 className="text-lg font-semibold">Overview & metrics</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <p className="rounded-lg border border-white/15 px-3 py-2 text-sm">Ad placements: {adsRes.count ?? 0}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2 text-sm">Payments: {paymentsRes.count ?? 0}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2 text-sm">Members: {usersRes.count ?? 0}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2 text-sm">Projects: {projectsRes.count ?? 0}</p>
        </div>
      </article>
      <article className="panel">
        <h2 className="text-lg font-semibold">Owner actions</h2>
        <div className="mt-3 grid gap-2">
          <Link href="/owner/ads" className="rounded-lg border border-white/15 px-3 py-2 text-sm hover:border-neon">Manage ad publishing placements</Link>
          <Link href="/owner/payments" className="rounded-lg border border-white/15 px-3 py-2 text-sm hover:border-neon">Manage payment and billing workflow</Link>
          <Link href="/owner/users" className="rounded-lg border border-white/15 px-3 py-2 text-sm hover:border-neon">Inspect users and projects</Link>
          <Link href="/owner/system" className="rounded-lg border border-white/15 px-3 py-2 text-sm hover:border-neon">Review system status</Link>
        </div>
      </article>
    </section>
  );
}

import { getOwnerAccessContextOrRedirect } from '@/lib/owner-access';
import { AdsManager } from '@/app/owner/ads/ads-manager';

export default async function OwnerAdsPage() {
  const { supabase, workspaceId } = await getOwnerAccessContextOrRedirect();

  const [placementsRes, eventsRes, revenueRes] = await Promise.all([
    supabase
      .from('ad_placements')
      .select('id, slot_name, page_path, position, internal_section, status, notes, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('ad_events')
      .select('id, event_type, payload, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('ads_revenue_records')
      .select('id, source, amount, currency, recorded_at')
      .eq('workspace_id', workspaceId)
      .order('recorded_at', { ascending: false })
      .limit(10)
  ]);

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="panel">
        <h2 className="text-lg font-semibold">Ad publishing management</h2>
        <p className="mt-1 text-sm text-white/70">Internal adapter-ready placements. External provider sync can be added later.</p>
        <div className="mt-3">
          <AdsManager />
        </div>
      </article>

      <article className="panel">
        <h2 className="text-lg font-semibold">Placement history</h2>
        <div className="mt-3 space-y-2 text-sm">
          {(placementsRes.data ?? []).map((placement) => (
            <div key={placement.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="font-medium">{placement.slot_name} • {placement.status}</p>
              <p className="text-white/70">{placement.page_path} / {placement.position}</p>
              <p className="text-xs text-white/60">{placement.internal_section ?? 'no section'} • {placement.created_at ? new Date(placement.created_at).toLocaleString('tr-TR') : ''}</p>
            </div>
          ))}
          {(placementsRes.data ?? []).length === 0 ? <p className="text-white/60">No placement records yet.</p> : null}
        </div>
      </article>

      <article className="panel">
        <h3 className="text-lg font-semibold">Ad events</h3>
        <div className="mt-3 space-y-2 text-xs">
          {(eventsRes.data ?? []).map((event) => (
            <div key={event.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p>{event.event_type}</p>
              <p className="text-white/60">{event.created_at ? new Date(event.created_at).toLocaleString('tr-TR') : ''}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <h3 className="text-lg font-semibold">Revenue placeholder</h3>
        <div className="mt-3 space-y-2 text-sm">
          {(revenueRes.data ?? []).map((item) => (
            <p key={item.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              {item.source}: {item.amount} {item.currency}
            </p>
          ))}
          {(revenueRes.data ?? []).length === 0 ? <p className="text-white/60">No revenue records yet.</p> : null}
        </div>
      </article>
    </section>
  );
}

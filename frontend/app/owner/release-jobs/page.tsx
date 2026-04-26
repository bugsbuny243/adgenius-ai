import { requirePlatformOwner } from '@/lib/owner-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

export default async function OwnerReleaseJobsPage() {
  await requirePlatformOwner();
  const supabase = createSupabaseServiceRoleClient();
  const { data: events } = await supabase
    .from('billing_events')
    .select('id, event_type, created_at, payload')
    .ilike('event_type', '%release%')
    .order('created_at', { ascending: false })
    .limit(30);

  return <section className="panel"><h2 className="text-lg font-semibold">Yayın İşleri</h2><div className="mt-3 space-y-2 text-sm">{(events ?? []).map((e)=><p key={e.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">{e.event_type} • {new Date(e.created_at ?? '').toLocaleString('tr-TR')}</p>)}</div></section>;
}

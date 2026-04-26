import { requirePlatformOwner } from '@/lib/owner-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

export default async function OwnerLogsPage() {
  await requirePlatformOwner();
  const supabase = createSupabaseServiceRoleClient();
  const { data: events } = await supabase
    .from('billing_events')
    .select('id, event_type, actor_user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  return <section className="panel"><h2 className="text-lg font-semibold">Loglar / Hata Kayıtları</h2><div className="mt-3 space-y-2 text-xs">{(events ?? []).map((e)=><p key={e.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">{e.event_type} • {e.actor_user_id ?? 'system'} • {new Date(e.created_at ?? '').toLocaleString('tr-TR')}</p>)}</div></section>;
}

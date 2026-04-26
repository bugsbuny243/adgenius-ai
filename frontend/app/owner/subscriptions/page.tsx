import { requirePlatformOwner } from '@/lib/owner-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

export default async function OwnerSubscriptionsPage() {
  await requirePlatformOwner();
  const supabase = createSupabaseServiceRoleClient();
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('id, user_id, plan_name, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  return <section className="panel"><h2 className="text-lg font-semibold">Abonelikler</h2><div className="mt-3 space-y-2 text-sm">{(subscriptions ?? []).map((s)=><p key={s.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">{s.plan_name} • {s.status} • {s.user_id}</p>)}</div></section>;
}

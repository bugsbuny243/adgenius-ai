import { requirePlatformOwner } from '@/lib/owner-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

export default async function OwnerGameFactoryPage() {
  await requirePlatformOwner();
  const supabase = createSupabaseServiceRoleClient();
  const { data: projects } = await supabase
    .from('unity_game_projects')
    .select('id, app_name, status, user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  return <section className="panel"><h2 className="text-lg font-semibold">Game Factory</h2><div className="mt-3 space-y-2 text-sm">{(projects ?? []).map((p)=><p key={p.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">{p.app_name} • {p.status} • {p.user_id}</p>)}</div></section>;
}

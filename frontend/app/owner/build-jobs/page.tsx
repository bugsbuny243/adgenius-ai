import { requirePlatformOwner } from '@/lib/owner-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

export default async function OwnerBuildJobsPage() {
  await requirePlatformOwner();
  const supabase = createSupabaseServiceRoleClient();
  const { data: jobs } = await supabase
    .from('unity_build_jobs')
    .select('id, unity_game_project_id, status, created_at, error_message')
    .order('created_at', { ascending: false })
    .limit(50);

  return <section className="panel"><h2 className="text-lg font-semibold">Build İşleri</h2><div className="mt-3 space-y-2 text-sm">{(jobs ?? []).map((j)=><p key={j.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">{j.unity_game_project_id} • {j.status} {j.error_message ? `• ${j.error_message}` : ''}</p>)}</div></section>;
}

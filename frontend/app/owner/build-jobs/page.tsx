import { requirePlatformOwner } from '@/lib/owner-auth';
import { fetchBackendForOwner } from '@/lib/backend-server';

export default async function OwnerBuildJobsPage() {
  await requirePlatformOwner();
  const response = await fetchBackendForOwner('/owner/build-jobs');
  const data = (await response.json().catch(() => ({ jobs: [] }))) as { jobs?: Array<{ id: string; unity_game_project_id: string; status: string; error_message: string | null }> };

  return <section className="panel"><h2 className="text-lg font-semibold">Build İşleri</h2><div className="mt-3 space-y-2 text-sm">{(data.jobs ?? []).map((j)=><p key={j.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">{j.unity_game_project_id} • {j.status} {j.error_message ? `• ${j.error_message}` : ''}</p>)}</div></section>;
}

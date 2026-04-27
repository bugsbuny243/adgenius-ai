import { requirePlatformOwner } from '@/lib/owner-auth';
import { fetchBackendForOwner } from '@/lib/backend-server';

export default async function OwnerReleaseJobsPage() {
  await requirePlatformOwner();
  const response = await fetchBackendForOwner('/owner/release-jobs');
  const data = (await response.json().catch(() => ({ jobs: [] }))) as { jobs?: Array<{ id: string; event_type: string; created_at: string | null }> };

  return <section className="panel"><h2 className="text-lg font-semibold">Yayın İşleri</h2><div className="mt-3 space-y-2 text-sm">{(data.jobs ?? []).map((e)=><p key={e.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">{e.event_type} • {new Date(e.created_at ?? '').toLocaleString('tr-TR')}</p>)}</div></section>;
}

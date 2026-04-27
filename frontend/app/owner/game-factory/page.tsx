import { requirePlatformOwner } from '@/lib/owner-auth';
import { fetchBackendForOwner } from '@/lib/backend-server';

export default async function OwnerGameFactoryPage() {
  await requirePlatformOwner();
  const response = await fetchBackendForOwner('/owner/summary');
  const data = (await response.json().catch(() => ({ projects: [] }))) as { projects?: Array<{ id: string; app_name: string; status: string }> };

  return <section className="panel"><h2 className="text-lg font-semibold">Game Factory</h2><div className="mt-3 space-y-2 text-sm">{(data.projects ?? []).map((p)=><p key={p.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">{p.app_name} • {p.status}</p>)}</div></section>;
}

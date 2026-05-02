import { requirePlatformOwner } from '@/lib/owner-auth';
import { fetchBackendForOwner } from '@/lib/backend-server';

export default async function OwnerSystemPage() {
  await requirePlatformOwner();
  const response = await fetchBackendForOwner('/health');
  const health = await response.json().catch(() => ({ ok: false }));

  return (
    <section className="panel space-y-3">
      <h1 className="text-xl font-semibold">System Status</h1>
      <p className="text-sm">Backend health: {health?.ok ? 'OK' : 'Degraded'}</p>
      <p className="text-xs text-white/70">Bu sayfa artık redirect yerine temel sistem sağlık görünümü sunar.</p>
    </section>
  );
}

import { requirePlatformOwner } from '@/lib/owner-auth';
import { fetchBackendForOwner } from '@/lib/backend-server';

export default async function OwnerSubscriptionsPage() {
  await requirePlatformOwner();
  const response = await fetchBackendForOwner('/owner/summary');
  const data = (await response.json().catch(() => ({ summary: null }))) as { summary?: { activeSubscriptions: number } };

  return <section className="panel"><h2 className="text-lg font-semibold">Abonelikler</h2><p className="mt-3 text-sm">Aktif abonelik sayısı: {data.summary?.activeSubscriptions ?? 0}</p></section>;
}

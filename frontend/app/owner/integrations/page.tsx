import { requirePlatformOwner } from '@/lib/owner-auth';
import { fetchBackendForOwner } from '@/lib/backend-server';

export default async function OwnerIntegrationsPage() {
  await requirePlatformOwner();
  const response = await fetchBackendForOwner('/owner/integrations');
  const data = (await response.json().catch(() => ({}))) as { integrationCount?: number; modelConfigCount?: number };

  return (
    <section className="panel">
      <h2 className="text-lg font-semibold">Sistem Entegrasyonları</h2>
      <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
        <p>Kullanıcı entegrasyon sayısı: {data.integrationCount ?? 0}</p>
        <p>Model config olay sayısı: {data.modelConfigCount ?? 0}</p>
      </div>
    </section>
  );
}

import Link from 'next/link';
import { requirePlatformOwner } from '@/lib/owner-auth';
import { fetchBackendForOwner } from '@/lib/backend-server';

type SummaryResponse = {
  ok: boolean;
  summary?: { users: number; activeSubscriptions: number; pendingOrders: number; approvedOrders: number; failedBuilds: number };
  projects?: Array<{ id: string; app_name: string; status: string; created_at: string | null }>;
  events?: Array<{ id: string; event_type: string; created_at: string | null }>;
};

export default async function OwnerOverviewPage() {
  await requirePlatformOwner();
  const response = await fetchBackendForOwner('/owner/summary');
  const data = (await response.json().catch(() => ({}))) as SummaryResponse;

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="panel lg:col-span-2">
        <h2 className="text-lg font-semibold">Genel Bakış</h2>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-4">
          <p className="rounded-lg border border-white/15 px-3 py-2">Toplam kullanıcı: {data.summary?.users ?? 0}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Aktif abonelik: {data.summary?.activeSubscriptions ?? 0}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Bekleyen Shopier ödeme: {data.summary?.pendingOrders ?? 0}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Onaylanmış manuel ödeme: {data.summary?.approvedOrders ?? 0}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Başarısız Unity build: {data.summary?.failedBuilds ?? 0}</p>
        </div>
      </article>

      <article className="panel">
        <h3 className="text-lg font-semibold">Son Game Factory Projeleri</h3>
        <div className="mt-3 space-y-2 text-sm">
          {(data.projects ?? []).map((project) => (
            <p key={project.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              {project.app_name} • {project.status} • {new Date(project.created_at ?? '').toLocaleString('tr-TR')}
            </p>
          ))}
        </div>
      </article>

      <article className="panel">
        <h3 className="text-lg font-semibold">Son Hata / Olay Kayıtları</h3>
        <div className="mt-3 space-y-2 text-xs">
          {(data.events ?? []).map((event) => (
            <p key={event.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              {event.event_type} • {new Date(event.created_at ?? '').toLocaleString('tr-TR')}
            </p>
          ))}
        </div>
      </article>

      <article className="panel lg:col-span-2">
        <h3 className="text-lg font-semibold">Hızlı Erişim</h3>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link href="/owner/payments" className="rounded-lg border border-white/15 px-3 py-2 hover:border-neon">Ödeme Onayları</Link>
          <Link href="/owner/subscriptions" className="rounded-lg border border-white/15 px-3 py-2 hover:border-neon">Abonelikler</Link>
          <Link href="/owner/integrations" className="rounded-lg border border-white/15 px-3 py-2 hover:border-neon">Sistem Entegrasyonları</Link>
          <Link href="/owner/logs" className="rounded-lg border border-white/15 px-3 py-2 hover:border-neon">Loglar</Link>
        </div>
      </article>
    </section>
  );
}

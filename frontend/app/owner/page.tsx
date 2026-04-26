import Link from 'next/link';
import { requirePlatformOwner } from '@/lib/owner-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

export default async function OwnerOverviewPage() {
  await requirePlatformOwner();
  const supabase = createSupabaseServiceRoleClient();

  const [usersRes, activeSubRes, pendingOrdersRes, approvedOrdersRes, failedBuildsRes, projectsRes, errorsRes, healthRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('payment_orders').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('provider', 'shopier'),
    supabase.from('payment_orders').select('id', { count: 'exact', head: true }).eq('status', 'approved').eq('provider', 'shopier'),
    supabase.from('unity_build_jobs').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    supabase.from('unity_game_projects').select('id, app_name, status, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('billing_events').select('id, event_type, payload, created_at').order('created_at', { ascending: false }).limit(5),
    fetch(`${process.env.APP_ORIGIN ?? 'http://localhost:3000'}/api/health`, { cache: 'no-store' }).then((r) => r.json()).catch(() => null)
  ]);

  const healthSummary = healthRes?.ok ? 'Sistem sağlıklı görünüyor' : 'Sistem durumu kontrol edilmeli';

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="panel lg:col-span-2">
        <h2 className="text-lg font-semibold">Genel Bakış</h2>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-4">
          <p className="rounded-lg border border-white/15 px-3 py-2">Toplam kullanıcı: {usersRes.count ?? 0}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Aktif abonelik: {activeSubRes.count ?? 0}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Bekleyen Shopier ödeme: {pendingOrdersRes.count ?? 0}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Onaylanmış manuel ödeme: {approvedOrdersRes.count ?? 0}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Başarısız Unity build: {failedBuildsRes.count ?? 0}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2 md:col-span-3">Sistem sağlık özeti: {healthSummary}</p>
        </div>
      </article>

      <article className="panel">
        <h3 className="text-lg font-semibold">Son Game Factory Projeleri</h3>
        <div className="mt-3 space-y-2 text-sm">
          {(projectsRes.data ?? []).map((project) => (
            <p key={project.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              {project.app_name} • {project.status} • {new Date(project.created_at ?? '').toLocaleString('tr-TR')}
            </p>
          ))}
        </div>
      </article>

      <article className="panel">
        <h3 className="text-lg font-semibold">Son Hata / Olay Kayıtları</h3>
        <div className="mt-3 space-y-2 text-xs">
          {(errorsRes.data ?? []).map((event) => (
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

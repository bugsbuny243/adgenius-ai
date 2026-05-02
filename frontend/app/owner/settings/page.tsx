import { requirePlatformOwner } from '@/lib/owner-auth';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OwnerSettingsPage() {
  await requirePlatformOwner();
  const supabase = await createSupabaseReadonlyServerClient();

  const [googleRes, buildStatusRes] = await Promise.all([
    supabase.from('user_integrations').select('id,status,updated_at').eq('provider', 'google_play').order('updated_at', { ascending: false }).limit(20),
    supabase.from('build_statuses').select('status,created_at').eq('service', 'google-play-api').order('created_at', { ascending: false }).limit(1).maybeSingle()
  ]);

  const activeGoogleConnections = (googleRes.data ?? []).filter((g) => (g.status ?? '').toLowerCase() === 'connected').length;

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="panel">
        <h2 className="text-lg font-semibold">Google Play API Durumu</h2>
        <p className="mt-3 text-sm">Bağlı hesap sayısı: <strong>{activeGoogleConnections}</strong></p>
        <p className="mt-2 text-sm">Son sistem durumu: <strong>{buildStatusRes.data?.status ?? 'bilinmiyor'}</strong></p>
      </article>

      <article className="panel">
        <h2 className="text-lg font-semibold">Global Ayarlar</h2>
        <p className="mt-3 text-sm text-slate-300">Bakım modu değeri: <strong>{process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true' ? 'Açık' : 'Kapalı'}</strong></p>
        <p className="mt-2 text-xs text-slate-400">Not: Bakım modu deploy ortam değişkeni ile yönetilir.</p>
      </article>
    </section>
  );
}

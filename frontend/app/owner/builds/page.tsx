import { requirePlatformOwner } from '@/lib/owner-auth';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OwnerBuildMonitorPage() {
  await requirePlatformOwner();
  const supabase = await createSupabaseReadonlyServerClient();

  const [jobsRes, statusRes] = await Promise.all([
    supabase.from('unity_build_jobs').select('id,unity_game_project_id,status,error_message,created_at,updated_at,metadata').order('created_at', { ascending: false }).limit(50),
    supabase.from('build_statuses').select('id,service,status,metadata,created_at').order('created_at', { ascending: false }).limit(20)
  ]);

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="panel">
        <h2 className="text-lg font-semibold">Build İşçi Durumu</h2>
        <div className="mt-3 space-y-2 text-sm">
          {(statusRes.data ?? []).map((s) => (
            <div key={s.id} className="rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2">
              <p>{s.service} • {s.status}</p>
              <p className="text-xs text-slate-400">{new Date(s.created_at ?? '').toLocaleString('tr-TR')}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <h2 className="text-lg font-semibold">Hatalı Build ve Loglar</h2>
        <div className="mt-3 space-y-2 text-sm">
          {(jobsRes.data ?? []).filter((j) => j.error_message || (j.status ?? '').toLowerCase().includes('fail')).map((j) => (
            <div key={j.id} className="rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-2">
              <p className="font-medium">{j.unity_game_project_id} • {j.status}</p>
              <p className="text-xs text-rose-200/90">{j.error_message ?? 'Hata mesajı yok'}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

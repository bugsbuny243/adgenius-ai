import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  brief_ready: { label: 'Brief Hazır', className: 'bg-amber-500/20 text-amber-200' },
  approved: { label: 'Onaylandı', className: 'bg-blue-500/20 text-blue-200' },
  building: { label: 'Build Devam Ediyor', className: 'bg-blue-500/20 text-blue-200' },
  build_ready: { label: 'Build Hazır', className: 'bg-emerald-500/20 text-emerald-200' },
  failed: { label: 'Hata', className: 'bg-red-500/20 text-red-200' }
};

export default async function GameFactoryPage() {
  const supabase = await createSupabaseReadonlyServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin');

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership?.workspace_id) {
    return <main className="panel">Çalışma alanı bulunamadı.</main>;
  }

  const { data: projects } = await supabase
    .from('unity_game_projects')
    .select('id, app_name, package_name, status, updated_at')
    .eq('workspace_id', membership.workspace_id)
    .order('created_at', { ascending: false });

  return (
    <main className="panel space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Koschei Game Factory</h1>
        <Link href="/game-factory/new" className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink">+ Yeni Proje</Link>
      </div>

      {!projects?.length ? (
        <section className="rounded-xl border border-white/10 bg-black/20 p-6 text-center">
          <p className="mb-4">Henüz proje yok. İlk oyununu oluşturmak için başla.</p>
          <Link href="/game-factory/new" className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink">Proje Oluştur</Link>
        </section>
      ) : (
        <div className="grid gap-3">
          {projects.map((project) => {
            const status = STATUS_MAP[project.status ?? ''] ?? { label: project.status ?? 'Bilinmiyor', className: 'bg-white/10 text-white' };
            return (
              <article key={project.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold">{project.app_name}</p>
                    <p className="text-sm text-white/70">{project.package_name}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs ${status.className}`}>{status.label}</span>
                </div>
                <p className="mt-2 text-xs text-white/60">Son build tarihi: {project.updated_at ? new Date(project.updated_at).toLocaleString('tr-TR') : '—'}</p>
                <div className="mt-3 flex gap-2">
                  <Link href={`/game-factory/${project.id}`} className="rounded-lg border border-white/20 px-3 py-2 text-sm">Detay</Link>
                  <Link href={`/game-factory/${project.id}/builds`} className="rounded-lg border border-white/20 px-3 py-2 text-sm">Buildler</Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

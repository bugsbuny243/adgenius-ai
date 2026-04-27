import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function statusLabel(ok: boolean) {
  return ok ? 'Bağlı' : 'Eksik';
}

export default async function GameFactorySettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseReadonlyServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin');

  const { data: project } = await supabase.from('unity_game_projects').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();

  if (!project) notFound();

  const { data: selectedIntegration } = project.google_play_integration_id
    ? await supabase
        .from('user_integrations')
        .select('id, display_name, service_account_email, status')
        .eq('id', project.google_play_integration_id)
        .eq('user_id', user.id)
        .eq('provider', 'google_play')
        .maybeSingle()
    : { data: null };


  return (
    <main>
      <Nav />
      <section className="panel space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{project.name} · Game Factory Ayarları</h1>
          <Link href={`/game-factory/${id}`} className="rounded-lg border border-white/20 px-3 py-2 text-sm">Projeye dön</Link>
        </div>

        <div className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/85">
          <p>Unity repo owner/name/branch: {project.unity_repo_owner ?? '-'} / {project.unity_repo_name ?? '-'} / {project.unity_branch ?? 'main'}</p>
          <p>Package name: {project.package_name}</p>
          <p>Release track: {project.release_track}</p>
          <p>Selected Google Play integration: {selectedIntegration?.display_name ?? 'Seçilmedi'}</p>
        </div>

        <div className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/85">
          <h2 className="text-lg font-semibold">Sistem durumu</h2>
          <p>GitHub Unity repo: {statusLabel(Boolean(project.unity_repo_owner && project.unity_repo_name))}</p>
          <p>Unity Build Automation: {statusLabel(Boolean(project.build_target))}</p>
          <p>Google Play: {statusLabel(Boolean(selectedIntegration && selectedIntegration.status === 'connected'))}</p>
        </div>

        <div className="flex gap-2">
          <Link href="/settings/integrations/google-play" className="rounded-lg border border-white/20 px-3 py-2 text-sm">Google Play bağlantılarını yönet</Link>
          <Link href={`/game-factory/${id}/release`} className="rounded-lg border border-white/20 px-3 py-2 text-sm">Yayın ekranına git</Link>
        </div>
      </section>
    </main>
  );
}

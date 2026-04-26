import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';
import { deleteGameProject } from '@/app/game-factory/actions';
import { StartBuildButton } from '@/app/game-factory/[id]/StartBuildButton';

export const dynamic = 'force-dynamic';

export default async function GameFactoryProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseReadonlyServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin');

  const [{ data: project }, { data: latestBuild }] = await Promise.all([
    supabase
      .from('unity_game_projects')
      .select('id, app_name, package_name, status, game_brief, approval_status')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('unity_build_jobs')
      .select('id, status, created_at, artifact_url')
      .eq('unity_game_project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  if (!project) notFound();

  const brief = (project.game_brief ?? {}) as Record<string, unknown>;
  const features = Array.isArray(brief.keyFeatures) ? brief.keyFeatures.map((item) => String(item)) : [];

  return (
    <main className="panel space-y-4">
      <header className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h1 className="text-2xl font-bold">{project.app_name}</h1>
        <p className="text-sm text-white/70">{project.package_name}</p>
        <span className="mt-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs">{project.status}</span>
      </header>

      <section className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
        <h2 className="mb-2 text-lg font-semibold">Brief</h2>
        <p><b>Açıklama:</b> {String(brief.description ?? '-')}</p>
        <p><b>Tür:</b> {String(brief.genre ?? '-')}</p>
        <p><b>Görsel stil:</b> {String(brief.visualStyle ?? '-')}</p>
        <p><b>Kontroller:</b> {String(brief.controls ?? '-')}</p>
        <ul className="mt-2 list-disc pl-5">
          {features.length ? features.map((feature) => <li key={feature}>{feature}</li>) : <li>Özellik bilgisi yok</li>}
        </ul>
      </section>

      <section className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
        <h2 className="mb-2 text-lg font-semibold">Son Build</h2>
        <p><b>Durum:</b> {latestBuild?.status ?? 'Henüz build yok'}</p>
        <p><b>Tarih:</b> {latestBuild?.created_at ? new Date(latestBuild.created_at).toLocaleString('tr-TR') : '—'}</p>
        {latestBuild?.artifact_url ? (
          <a href={latestBuild.artifact_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex rounded-lg border border-white/20 px-3 py-2">
            İndir
          </a>
        ) : null}
      </section>

      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h2 className="mb-3 text-lg font-semibold">Aksiyonlar</h2>
        <div className="flex flex-wrap gap-2">
          <Link href={`/game-factory/${id}/builds`} className="rounded-lg border border-white/20 px-4 py-2">Buildleri Gör</Link>
          {project.approval_status === 'approved' ? <StartBuildButton projectId={id} /> : <p className="text-sm text-amber-300">Build için önce onay gerekli.</p>}
          <form action={deleteGameProject.bind(null, id)}>
            <button type="submit" className="rounded-lg border border-red-400/40 px-4 py-2 text-red-200">Sil</button>
          </form>
        </div>
      </section>
    </main>
  );
}

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { PublishButton } from '@/components/game-factory/publish-button';
import { publishReleaseAction, updateReleaseNotesAction } from '@/app/game-factory/actions';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function GameFactoryReleasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const [{ data: project }, { data: brief }, { data: buildJob }, { data: releaseJob }, { data: artifact }] = await Promise.all([
    supabase.from('game_projects').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('game_briefs').select('*').eq('game_project_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('game_build_jobs').select('*').eq('game_project_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('game_release_jobs').select('*').eq('game_project_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('game_artifacts').select('*').eq('game_project_id', id).eq('artifact_type', 'aab').order('created_at', { ascending: false }).limit(1).maybeSingle()
  ]);

  if (!project) notFound();

  return (
    <main>
      <Nav />
      <section className="panel space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{project.name} · Yayın</h1>
          <Link href={`/game-factory/${id}`} className="rounded-lg border border-white/20 px-3 py-2 text-sm">Projeye dön</Link>
        </div>

        <div className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
          <p>App name: {project.product_name || project.name}</p>
          <p>Package name: {project.package_name}</p>
          <p>Version: {buildJob?.version_name ?? project.current_version_name} ({buildJob?.version_code ?? project.current_version_code})</p>
          <p>Release track: {releaseJob?.track ?? project.release_track}</p>
          <p>Short description: {brief?.store_short_description ?? '-'}</p>
          <p>Full description: {brief?.store_full_description ?? '-'}</p>
          <p>AAB artifact: {artifact?.file_url ? <a className="text-neon underline" href={artifact.file_url}>Bağlantı</a> : 'Yok'}</p>
        </div>

        <form action={updateReleaseNotesAction.bind(null, id)} className="space-y-2">
          <label className="block text-sm">Release notes</label>
          <textarea name="release_notes" rows={6} defaultValue={releaseJob?.release_notes ?? brief?.release_notes ?? ''} className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
          <button className="rounded-lg border border-white/20 px-3 py-2 text-sm">Notları kaydet</button>
        </form>

        <form action={publishReleaseAction.bind(null, id)} className="space-y-2">
          <PublishButton label="Yayınla" />
        </form>

        {releaseJob?.error_message ? (
          <p className="rounded-lg border border-red-400/40 bg-red-950/30 p-3 text-sm text-red-200">{releaseJob.error_message}</p>
        ) : null}
      </section>
    </main>
  );
}

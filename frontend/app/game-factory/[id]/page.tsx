import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  approveReleaseAction,
  commitUnityRepoAction,
  generateGameAction,
  prepareReleaseAction,
  publishReleaseAction,
  refreshBuildStatusAction,
  triggerBuildAction
} from '@/app/game-factory/actions';
import { PublishButton } from '@/components/game-factory/publish-button';

export const dynamic = 'force-dynamic';

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/20 p-4">
      <h3 className="mb-3 text-lg font-semibold">{title}</h3>
      {children}
    </article>
  );
}

export default async function GameFactoryProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const [{ data: project }, { data: brief }, { data: buildJob }, { data: artifact }, { data: releaseJob }] = await Promise.all([
    supabase.from('game_projects').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('game_briefs').select('*').eq('game_project_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('game_build_jobs').select('*').eq('game_project_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('game_artifacts').select('*').eq('game_project_id', id).eq('artifact_type', 'aab').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('game_release_jobs').select('*').eq('game_project_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  ]);

  if (!project) notFound();

  return (
    <main>
      <Nav />
      <section className="panel space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-sm text-white/70">Durum: {project.status}</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/game-factory/${id}/builds`} className="rounded-lg border border-white/20 px-3 py-2 text-sm">Build geçmişi</Link>
            <Link href={`/game-factory/${id}/release`} className="rounded-lg border border-white/20 px-3 py-2 text-sm">Yayın</Link>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="1. Brief">
            <p className="text-sm text-white/75">{brief?.generated_summary || brief?.prompt || 'Brief bekleniyor.'}</p>
          </Card>

          <Card title="2. Unity project generation">
            <form action={generateGameAction.bind(null, id)}>
              <button className="rounded-lg border border-white/20 px-3 py-2 text-sm">Oyunu üret</button>
            </form>
          </Card>

          <Card title="3. GitHub commit">
            <p className="mb-2 text-xs text-white/60">Son commit: {project.unity_commit_sha || '-'}</p>
            <form action={commitUnityRepoAction.bind(null, id)}>
              <button className="rounded-lg border border-white/20 px-3 py-2 text-sm">Unity repo’ya gönder</button>
            </form>
          </Card>

          <Card title="4. Unity build">
            <p className="mb-2 text-xs text-white/60">Build: {buildJob?.status || '-'}</p>
            <div className="flex gap-2">
              <form action={triggerBuildAction.bind(null, id)}>
                <button className="rounded-lg border border-white/20 px-3 py-2 text-sm">Build başlat</button>
              </form>
              <form action={refreshBuildStatusAction.bind(null, id)}>
                <button className="rounded-lg border border-white/20 px-3 py-2 text-sm">Build durumunu yenile</button>
              </form>
            </div>
          </Card>

          <Card title="5. AAB artifact">
            {artifact?.file_url ? (
              <a className="text-neon underline" href={artifact.file_url} target="_blank" rel="noreferrer">
                AAB indir
              </a>
            ) : (
              <p className="text-sm text-white/70">AAB henüz hazır değil.</p>
            )}
          </Card>

          <Card title="6. Release preparation">
            <p className="mb-2 text-xs text-white/60">Durum: {releaseJob?.status || 'Hazırlanmadı'}</p>
            <div className="flex gap-2">
              <form action={prepareReleaseAction.bind(null, id)}>
                <button className="rounded-lg border border-white/20 px-3 py-2 text-sm">Yayın hazırlığını oluştur</button>
              </form>
              <form action={approveReleaseAction.bind(null, id)}>
                <button className="rounded-lg border border-white/20 px-3 py-2 text-sm">Kullanıcı onayı ver</button>
              </form>
            </div>
          </Card>

          <Card title="7. Publish">
            <form action={publishReleaseAction.bind(null, id)} className="flex items-center gap-2">
              <PublishButton />
            </form>
            {releaseJob?.status === 'blocked_by_platform_requirement' ? (
              <p className="mt-2 text-sm text-yellow-300">Platform gereksinimi nedeniyle durduruldu: {releaseJob.error_message}</p>
            ) : null}
          </Card>
        </div>
      </section>
    </main>
  );
}

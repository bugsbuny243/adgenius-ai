import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function GameFactoryBuildsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const [{ data: project }, { data: builds }] = await Promise.all([
    supabase.from('game_projects').select('id, name').eq('id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('game_build_jobs').select('*').eq('game_project_id', id).order('created_at', { ascending: false })
  ]);

  if (!project) notFound();

  return (
    <main>
      <Nav />
      <section className="panel space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{project.name} · Build geçmişi</h1>
          <Link href={`/game-factory/${id}`} className="rounded-lg border border-white/20 px-3 py-2 text-sm">Projeye dön</Link>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-black/30 text-left">
              <tr>
                <th className="px-3 py-2">Sürüm</th>
                <th className="px-3 py-2">Durum</th>
                <th className="px-3 py-2">Branch</th>
                <th className="px-3 py-2">Commit SHA</th>
                <th className="px-3 py-2">Başlangıç</th>
                <th className="px-3 py-2">Bitiş</th>
                <th className="px-3 py-2">Artifact</th>
                <th className="px-3 py-2">Log</th>
                <th className="px-3 py-2">Hata</th>
              </tr>
            </thead>
            <tbody>
              {(builds ?? []).map((build) => (
                <tr key={build.id} className="border-t border-white/10">
                  <td className="px-3 py-2">{build.version_name ?? '-'} ({build.version_code ?? '-'})</td>
                  <td className="px-3 py-2">{build.status}</td>
                  <td className="px-3 py-2">{build.branch}</td>
                  <td className="px-3 py-2">{build.commit_sha ?? '-'}</td>
                  <td className="px-3 py-2">{build.started_at ? new Date(build.started_at).toLocaleString('tr-TR') : '-'}</td>
                  <td className="px-3 py-2">{build.finished_at ? new Date(build.finished_at).toLocaleString('tr-TR') : '-'}</td>
                  <td className="px-3 py-2">{build.artifact_url ? <a href={build.artifact_url} target="_blank" rel="noreferrer" className="text-neon underline">AAB indir</a> : '-'}</td>
                  <td className="px-3 py-2">{build.logs_url ? <a href={build.logs_url} target="_blank" rel="noreferrer" className="text-neon underline">Bağlantı</a> : '-'}</td>
                  <td className="px-3 py-2">{build.error_message ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

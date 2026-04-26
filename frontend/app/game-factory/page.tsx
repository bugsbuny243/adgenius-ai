import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';
import { gameFactoryStatusLabel } from '@/lib/game-factory/ui';

export const dynamic = 'force-dynamic';

export default async function GameFactoryPage() {
  const supabase = await createSupabaseReadonlyServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin');

  const { data: projects } = await supabase
    .from('game_projects')
    .select('id, name, game_type, status, package_name')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const projectIds = (projects ?? []).map((project) => project.id);
  const [{ data: buildJobs }, { data: releaseJobs }] = await Promise.all([
    projectIds.length
      ? supabase
          .from('game_build_jobs')
          .select('game_project_id, status, created_at')
          .in('game_project_id', projectIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    projectIds.length
      ? supabase
          .from('game_release_jobs')
          .select('game_project_id, status, created_at')
          .in('game_project_id', projectIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] })
  ]);

  const latestBuildByProject = new Map<string, string>();
  for (const job of buildJobs ?? []) {
    if (!latestBuildByProject.has(job.game_project_id)) {
      latestBuildByProject.set(job.game_project_id, job.status);
    }
  }

  const latestReleaseByProject = new Map<string, string>();
  for (const job of releaseJobs ?? []) {
    if (!latestReleaseByProject.has(job.game_project_id)) {
      latestReleaseByProject.set(job.game_project_id, job.status);
    }
  }

  return (
    <main>
      <Nav />
      <section className="panel space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-lilac">Koschei Game Factory</p>
            <h1 className="text-3xl font-bold">Game Factory</h1>
          </div>
          <Link href="/game-factory/new" className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink">
            Yeni oyun oluştur
          </Link>
        </div>

        <div className="space-y-3 md:hidden">
          {(projects ?? []).map((project) => (
            <article key={project.id} className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
              <p className="text-lg font-semibold">{project.name}</p>
              <p className="text-white/70">Durum: {gameFactoryStatusLabel(project.status)}</p>
              <p className="text-white/70">Paket: {project.package_name || '—'}</p>
              <Link className="mt-3 inline-flex rounded-lg border border-white/20 px-3 py-2" href={`/game-factory/${project.id}`}>
                Aç
              </Link>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">
          <table className="min-w-full text-sm">
            <thead className="bg-black/30 text-left">
              <tr>
                <th className="px-3 py-2">Ad</th>
                <th className="px-3 py-2">Oyun tipi</th>
                <th className="px-3 py-2">Durum</th>
                <th className="px-3 py-2">Paket adı</th>
                <th className="px-3 py-2">Son build</th>
                <th className="px-3 py-2">Son yayın</th>
                <th className="px-3 py-2">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {(projects ?? []).map((project) => {
                const latestBuildStatus = latestBuildByProject.get(project.id) ?? null;
                const latestReleaseStatus = latestReleaseByProject.get(project.id) ?? null;
                const latestBuild = latestBuildStatus ? gameFactoryStatusLabel(latestBuildStatus) : '—';
                const latestRelease = latestReleaseStatus ? gameFactoryStatusLabel(latestReleaseStatus) : '—';
                return (
                  <tr key={project.id} className="border-t border-white/10 hover:bg-white/5">
                    <td className="px-3 py-2">
                      <Link className="text-neon" href={`/game-factory/${project.id}`}>
                        {project.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{project.game_type}</td>
                    <td className="px-3 py-2">{gameFactoryStatusLabel(project.status)}</td>
                    <td className="px-3 py-2">{project.package_name}</td>
                    <td className="px-3 py-2">{latestBuild}</td>
                    <td className="px-3 py-2">{latestRelease}</td>
                    <td className="px-3 py-2">
                      <Link className="rounded-lg border border-white/20 px-3 py-1.5" href={`/game-factory/${project.id}`}>
                        Aç
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

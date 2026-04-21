import Link from 'next/link';
import { Nav } from '@/components/nav';
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge';
import { getAppContextOrRedirect } from '@/lib/app-context';
import { normalizeProjectStatus, projectStatusLabel } from '@/lib/project-status';
import { createProjectAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const { supabase, workspace, userId } = await getAppContextOrRedirect();

  const [{ data: projects, error }, { data: items, error: itemsError }, { data: savedOutputs }, { data: contentItems }] = await Promise.all([
    supabase.from('projects').select('id, name, description, status, created_at, updated_at, workspace_id, user_id').eq('workspace_id', workspace.workspaceId).eq('user_id', userId).order('updated_at', { ascending: false }),
    supabase.from('project_items').select('project_id, item_type, created_at').eq('workspace_id', workspace.workspaceId).eq('user_id', userId),
    supabase.from('saved_outputs').select('id, project_id, created_at').eq('workspace_id', workspace.workspaceId).eq('user_id', userId),
    supabase.from('content_items').select('id, project_id, created_at').eq('workspace_id', workspace.workspaceId).eq('user_id', userId)
  ]);

  const itemStats = (items ?? []).reduce<Record<string, { count: number; types: Set<string>; lastItemAt: string | null }>>((acc, item) => {
    if (!acc[item.project_id]) acc[item.project_id] = { count: 0, types: new Set<string>(), lastItemAt: null };
    acc[item.project_id].count += 1;
    acc[item.project_id].types.add(item.item_type);
    const currentLast = acc[item.project_id].lastItemAt;
    acc[item.project_id].lastItemAt = !currentLast || new Date(item.created_at).getTime() > new Date(currentLast).getTime() ? item.created_at : currentLast;
    return acc;
  }, {});

  const savedCounts = (savedOutputs ?? []).reduce<Record<string, number>>((acc, item: { project_id: string | null }) => {
    if (item.project_id) acc[item.project_id] = (acc[item.project_id] ?? 0) + 1;
    return acc;
  }, {});

  const contentCounts = (contentItems ?? []).reduce<Record<string, number>>((acc, item: { project_id: string | null }) => {
    if (item.project_id) acc[item.project_id] = (acc[item.project_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main>
      <Nav />
      <section className="panel mb-4">
        <h2 className="mb-2 text-2xl font-semibold">Projects Workflow Board</h2>
        <p className="mb-4 text-sm text-white/70">Koschei AI proje merkezinde status, brief, revision/delivery notları ve saved output akışını takip edin.</p>
        <form action={createProjectAction} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
          <input name="name" required placeholder="Proje adı" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
          <input name="description" placeholder="Kısa açıklama" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
          <button type="submit" className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink">Oluştur</button>
        </form>
      </section>

      <section className="panel">
        {itemsError ? <p className="mb-3 text-xs text-amber-200">Öğe özeti yüklenemedi, proje listesi gösteriliyor.</p> : null}
        {error ? (
          <p className="text-sm text-red-300">Projeler yüklenemedi: {error.message}</p>
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {projects.map((project) => {
              const types = itemStats[project.id]?.types ?? new Set<string>();
              const hasBrief = types.has('brief');
              const hasRevision = types.has('revision_note');
              const hasDelivery = types.has('delivery_note');
              const lastActivity = itemStats[project.id]?.lastItemAt ?? project.updated_at ?? project.created_at;

              return (
                <Link key={project.id} href={`/projects/${project.id}`} className="block rounded-xl border border-white/10 bg-black/20 px-4 py-3 hover:border-neon">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="font-medium">{project.name}</p>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  <p className="text-sm text-white/60">{project.description || 'Açıklama yok.'}</p>
                  <div className="mt-2 grid gap-1 text-xs text-white/60">
                    <p>Status: {projectStatusLabel(normalizeProjectStatus(project.status))}</p>
                    <p>Brief: {hasBrief ? 'Hazır' : 'Bekliyor'}</p>
                    <p>Revision notu: {hasRevision ? 'Var' : 'Yok'} • Delivery notu: {hasDelivery ? 'Var' : 'Yok'}</p>
                    <p>Toplam saved output: {savedCounts[project.id] ?? 0}</p>
                    <p>Toplam öğe: {itemStats[project.id]?.count ?? 0}</p>
                    <p>Son aktivite: {new Date(lastActivity).toLocaleString('tr-TR')}</p>
                    <p className="text-white/45">Social içerik (legacy): {contentCounts[project.id] ?? 0}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
            <p>Henüz proje yok. İlk workflow projesini şimdi açın.</p>
          </div>
        )}
      </section>
    </main>
  );
}

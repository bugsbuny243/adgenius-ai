import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge';
import { ProjectTimeline } from '@/components/projects/ProjectTimeline';
import { ProjectWorkflowPanel } from '@/components/projects/ProjectWorkflowPanel';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { buildWorkflowTimeline, filterItemsByType, findLatestItem, type WorkflowItemRecord } from '@/lib/project-workflow';
import { getWorkspaceContext } from '@/lib/workspace';
import {
  attachSavedOutputToProjectItemAction,
  createBriefItemAction,
  createDeliveryNoteAction,
  createProjectItemAction,
  createRevisionNoteAction,
  createScopeItemAction,
  createTaskPlanItemAction,
  updateProjectStatusAction
} from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { workspaceId, userId } = await getWorkspaceContext();

  const createBrief = createBriefItemAction.bind(null, id);
  const createScope = createScopeItemAction.bind(null, id);
  const createTaskPlan = createTaskPlanItemAction.bind(null, id);
  const createRevisionNote = createRevisionNoteAction.bind(null, id);
  const createDeliveryNote = createDeliveryNoteAction.bind(null, id);
  const createItem = createProjectItemAction.bind(null, id);
  const updateStatus = updateProjectStatusAction.bind(null, id);
  const attachOutput = attachSavedOutputToProjectItemAction.bind(null, id);

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, description, status, created_at, updated_at')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!project) notFound();

  const [{ data: items }, { data: outputs }] = await Promise.all([
    supabase.from('project_items').select('id, item_type, title, content, created_at').eq('project_id', project.id).eq('user_id', userId).eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
    supabase.from('saved_outputs').select('id, title, content, project_item_id, created_at').eq('project_id', project.id).eq('workspace_id', workspaceId).eq('user_id', userId).order('created_at', { ascending: false }).limit(12)
  ]);

  const workflowItems = (items ?? []) as WorkflowItemRecord[];
  const briefItem = findLatestItem(workflowItems, 'brief');
  const scopeItem = findLatestItem(workflowItems, 'scope');
  const taskPlanItem = findLatestItem(workflowItems, 'task_plan');
  const deliveryItem = findLatestItem(workflowItems, 'delivery_note');
  const revisionItems = filterItemsByType(workflowItems, 'revision_note');
  const timelineItems = buildWorkflowTimeline(workflowItems).slice(0, 12);
  const selectedFinalOutput = (outputs ?? []).find((output) => Boolean(output.project_item_id)) ?? (outputs ?? [])[0] ?? null;

  const lastActivity = [project.updated_at, project.created_at, ...workflowItems.map((item) => item.created_at), ...(outputs ?? []).map((item) => item.created_at)]
    .filter(Boolean)
    .sort((a, b) => new Date(String(b)).getTime() - new Date(String(a)).getTime())[0];

  return (
    <main>
      <Nav />
      <section className="panel mb-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-2xl font-semibold">{project.name}</h2>
              <ProjectStatusBadge status={project.status} />
            </div>
            <p className="text-sm text-white/70">{project.description || 'Açıklama henüz eklenmedi.'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/agents" className="rounded-lg border border-neon/40 px-3 py-2 text-sm text-neon">Bu proje için yeni çalışma başlat</Link>
            <Link href="/saved" className="rounded-lg border border-white/20 px-3 py-2 text-sm">Kaydedilmiş çıktıyı yeniden işle</Link>
          </div>
        </div>

        <form action={updateStatus} className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="status" className="text-white/70">Durum:</label>
          <select id="status" name="status" defaultValue={project.status ?? 'draft'} className="rounded-lg border border-white/20 bg-black/30 px-3 py-2">
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="in_revision">In Revision</option>
            <option value="near_delivery">Near Delivery</option>
            <option value="delivered">Delivered</option>
          </select>
          <button type="submit" className="rounded-lg border border-white/20 px-3 py-2">Güncelle</button>
        </form>

        <div className="grid gap-2 text-sm md:grid-cols-4">
          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Toplam öğe: {items?.length ?? 0}</p>
          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Toplam saved output: {outputs?.length ?? 0}</p>
          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Revision notu: {revisionItems.length}</p>
          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Son aktivite: {lastActivity ? new Date(String(lastActivity)).toLocaleString('tr-TR') : 'Yok'}</p>
        </div>
      </section>

      <section className="mb-4 grid gap-4 lg:grid-cols-3">
        <ProjectWorkflowPanel
          title="Brief"
          item={briefItem}
          emptyText="Henüz brief eklenmedi."
          action={
            <form action={createBrief} className="flex gap-2">
              <input name="content" placeholder="Kısa brief" className="rounded border border-white/20 bg-black/30 px-2 py-1 text-xs" required />
              <button type="submit" className="rounded border border-white/20 px-2 py-1 text-xs">Ekle</button>
            </form>
          }
        />
        <ProjectWorkflowPanel
          title="Scope"
          item={scopeItem}
          emptyText="Henüz scope eklenmedi."
          action={
            <form action={createScope} className="flex gap-2">
              <input name="content" placeholder="Scope özeti" className="rounded border border-white/20 bg-black/30 px-2 py-1 text-xs" required />
              <button type="submit" className="rounded border border-white/20 px-2 py-1 text-xs">Ekle</button>
            </form>
          }
        />
        <ProjectWorkflowPanel
          title="Task Plan"
          item={taskPlanItem}
          emptyText="Henüz task plan yok."
          action={
            <form action={createTaskPlan} className="flex gap-2">
              <input name="content" placeholder="Task plan" className="rounded border border-white/20 bg-black/30 px-2 py-1 text-xs" required />
              <button type="submit" className="rounded border border-white/20 px-2 py-1 text-xs">Ekle</button>
            </form>
          }
        />
      </section>

      <section className="mb-4 grid gap-4 lg:grid-cols-2">
        <article className="panel">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Revision Notes</h3>
            <form action={createRevisionNote} className="flex gap-2">
              <input name="content" placeholder="Yeni revision notu" className="rounded border border-white/20 bg-black/30 px-2 py-1 text-xs" required />
              <button type="submit" className="rounded border border-white/20 px-2 py-1 text-xs">Ekle</button>
            </form>
          </div>
          <div className="space-y-2">
            {revisionItems.length === 0 ? <p className="text-sm text-white/70">Henüz revision notu yok.</p> : null}
            {revisionItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm">
                <p className="font-medium">{item.title || 'Revision Note'}</p>
                <p className="text-white/75">{item.content || '-'}</p>
                <p className="text-xs text-white/55">{new Date(item.created_at).toLocaleString('tr-TR')}</p>
              </div>
            ))}
          </div>
        </article>

        <ProjectWorkflowPanel
          title="Delivery Note"
          item={deliveryItem}
          emptyText="Henüz delivery note yok."
          action={
            <form action={createDeliveryNote} className="flex gap-2">
              <input name="content" placeholder="Delivery note" className="rounded border border-white/20 bg-black/30 px-2 py-1 text-xs" required />
              <button type="submit" className="rounded border border-white/20 px-2 py-1 text-xs">Ekle</button>
            </form>
          }
        />
      </section>

      <section className="mb-4 grid gap-4 lg:grid-cols-2">
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Simple Timeline</h3>
          <ProjectTimeline items={timelineItems} />
        </article>

        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Selected Final Output</h3>
          {!selectedFinalOutput ? <p className="text-sm text-white/70">Henüz seçili çıktı yok.</p> : null}
          {selectedFinalOutput ? (
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
              <p className="font-medium">{selectedFinalOutput.title || 'Kaydedilen çıktı'}</p>
              <p className="mt-1 line-clamp-6 text-white/75">{selectedFinalOutput.content}</p>
              <p className="mt-2 text-xs text-white/55">{new Date(selectedFinalOutput.created_at).toLocaleString('tr-TR')}</p>
            </div>
          ) : null}
          {(outputs ?? []).length > 0 && (items ?? []).length > 0 ? (
            <form action={attachOutput} className="mt-3 grid gap-2 text-sm">
              <select name="saved_output_id" className="rounded border border-white/20 bg-black/30 px-2 py-2">
                {(outputs ?? []).map((output) => (
                  <option key={output.id} value={output.id}>{output.title || 'Kaydedilen çıktı'}</option>
                ))}
              </select>
              <select name="project_item_id" className="rounded border border-white/20 bg-black/30 px-2 py-2">
                {(items ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{item.title || item.item_type}</option>
                ))}
              </select>
              <button type="submit" className="rounded border border-white/20 px-3 py-2">Çıktıyı workflow öğesine bağla</button>
            </form>
          ) : null}
        </article>
      </section>

      <section className="panel">
        <h3 className="mb-3 text-lg font-semibold">Serbest Proje Öğesi Ekle</h3>
        <form action={createItem} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
          <input name="title" required placeholder="Öğe başlığı" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
          <input name="details" placeholder="Öğe detayları (opsiyonel)" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
          <button type="submit" className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink">Öğe Ekle</button>
        </form>
      </section>
    </main>
  );
}

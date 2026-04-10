import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Nav } from '@/components/nav';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';
import { createKnowledgeSource } from '@/lib/knowledge';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { workspaceId, userId } = await getWorkspaceContext();

  async function createItem(formData: FormData) {
    'use server';

    const title = String(formData.get('title') ?? '').trim();
    const details = String(formData.get('details') ?? '').trim();

    if (!title) return;

    const serverSupabase = await createSupabaseServerClient();
    const {
      data: { user: currentUser }
    } = await serverSupabase.auth.getUser();

    if (!currentUser) redirect('/login');

    const { workspaceId: currentWorkspaceId } = await getWorkspaceContext();

    await serverSupabase.from('project_items').insert({
      workspace_id: currentWorkspaceId,
      project_id: id,
      user_id: currentUser.id,
      item_type: 'note',
      title,
      status: 'open',
      payload: details ? { details } : null
    });

    revalidatePath(`/projects/${id}`);
  }

  async function addSource(formData: FormData) {
    'use server';

    const title = String(formData.get('title') ?? '').trim();
    const sourceType = String(formData.get('source_type') ?? 'text').trim() as 'file' | 'text' | 'url' | 'brief';
    const rawText = String(formData.get('raw_text') ?? '').trim();
    const sourceUrl = String(formData.get('source_url') ?? '').trim();

    if (!title || (!rawText && !sourceUrl)) return;

    const serverSupabase = await createSupabaseServerClient();
    const {
      data: { user: currentUser }
    } = await serverSupabase.auth.getUser();

    if (!currentUser) redirect('/login');

    const { workspaceId: currentWorkspaceId } = await getWorkspaceContext();

    await createKnowledgeSource({
      supabase: serverSupabase,
      workspaceId: currentWorkspaceId,
      projectId: id,
      userId: currentUser.id,
      sourceType,
      title,
      rawText: rawText || null,
      sourceUrl: sourceUrl || null,
      metadata: { source: 'project-page-form' }
    });

    revalidatePath(`/projects/${id}`);
  }

  async function addProjectKnowledge(formData: FormData) {
    'use server';

    const title = String(formData.get('title') ?? '').trim();
    const content = String(formData.get('content') ?? '').trim();
    const entryType = String(formData.get('entry_type') ?? 'note').trim();
    const sourceIdRaw = String(formData.get('source_id') ?? '').trim();

    if (!title || !content) return;

    const serverSupabase = await createSupabaseServerClient();
    const {
      data: { user: currentUser }
    } = await serverSupabase.auth.getUser();

    if (!currentUser) redirect('/login');

    const { workspaceId: currentWorkspaceId } = await getWorkspaceContext();

    await serverSupabase.from('project_knowledge_entries').insert({
      workspace_id: currentWorkspaceId,
      project_id: id,
      source_id: sourceIdRaw || null,
      entry_type: entryType || 'note',
      title,
      content,
      metadata: {},
      created_by: currentUser.id
    });

    revalidatePath(`/projects/${id}`);
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, description, status, created_at')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const [{ data: items }, { data: outputs }, { data: knowledgeEntries }, { data: sources }] = await Promise.all([
    supabase
      .from('project_items')
      .select('id, item_type, title, status, payload, source_output_id, created_at')
      .eq('project_id', project.id)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),
    supabase
      .from('saved_outputs')
      .select('id, title, content, created_at, agent_runs(status)')
      .eq('project_id', project.id)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('project_knowledge_entries')
      .select('id, title, content, entry_type, source_id, created_at')
      .eq('workspace_id', workspaceId)
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('knowledge_sources')
      .select('id, title, source_type, status, created_at')
      .eq('workspace_id', workspaceId)
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(10)
  ]);

  return (
    <main>
      <Nav />
      <section className="panel mb-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{project.name}</h2>
            <p className="text-sm text-white/70">{project.description || 'No description yet.'}</p>
          </div>
          <Link href="/projects" className="rounded-lg border border-white/20 px-3 py-2 text-sm">
            Back to Projects
          </Link>
        </div>

        <form action={createItem} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
          <input
            name="title"
            required
            placeholder="Item title"
            className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
          />
          <input
            name="details"
            placeholder="Item details (optional)"
            className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
          />
          <button type="submit" className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink">
            Add Item
          </button>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Project Items</h3>
          {items && items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border border-white/10 px-3 py-2">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-white/70">
                    {(item.payload && typeof item.payload === 'object' && 'details' in item.payload
                      ? String(item.payload.details ?? '')
                      : '') || 'No details.'}
                  </p>
                  <p className="text-xs text-white/50">Type: {item.item_type}</p>
                  <p className="text-xs text-white/50">Status: {item.status}</p>
                  {item.source_output_id ? <p className="text-xs text-white/50">From output: {item.source_output_id}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/70">No project items yet.</p>
          )}
        </article>

        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Recent Saved Outputs</h3>
          {outputs && outputs.length > 0 ? (
            <div className="space-y-2">
              {outputs.map((output) => (
                <div key={output.id} className="rounded-lg border border-white/10 px-3 py-2">
                  <p className="font-medium">{output.title || 'Saved output'}</p>
                  <p className="text-sm text-white/70 line-clamp-3">{output.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/70">No saved outputs linked to this project.</p>
          )}
        </article>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Add Knowledge Source</h3>
          <form action={addSource} className="space-y-2">
            <input
              name="title"
              required
              placeholder="Source title"
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neon"
            />
            <select
              name="source_type"
              defaultValue="text"
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neon"
            >
              <option value="text">text</option>
              <option value="brief">brief</option>
              <option value="url">url</option>
              <option value="file">file</option>
            </select>
            <input
              name="source_url"
              placeholder="Source URL (optional)"
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neon"
            />
            <textarea
              name="raw_text"
              rows={4}
              placeholder="Raw source text"
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neon"
            />
            <button type="submit" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-neon">
              Save source
            </button>
          </form>
        </article>

        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Project Sources</h3>
          {sources && sources.length > 0 ? (
            <div className="space-y-2 text-sm">
              {sources.map((source) => (
                <div key={source.id} className="rounded-lg border border-white/10 px-3 py-2">
                  <p className="font-medium">{source.title}</p>
                  <p className="text-xs text-white/60">
                    {source.source_type} • {source.status}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/70">No sources yet.</p>
          )}
        </article>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Add Project Knowledge</h3>
          <form action={addProjectKnowledge} className="space-y-2">
            <input
              name="title"
              required
              placeholder="Knowledge title"
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neon"
            />
            <textarea
              name="content"
              required
              rows={4}
              placeholder="Knowledge entry content"
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neon"
            />
            <input
              name="entry_type"
              defaultValue="note"
              placeholder="Type (note, strategy, constraint...)"
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neon"
            />
            <select
              name="source_id"
              defaultValue=""
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neon"
            >
              <option value="">No source linkage</option>
              {sources?.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.title}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-neon">
              Save project knowledge
            </button>
          </form>
        </article>

        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Project Knowledge Entries</h3>
          {knowledgeEntries && knowledgeEntries.length > 0 ? (
            <div className="space-y-2 text-sm">
              {knowledgeEntries.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-white/10 px-3 py-2">
                  <p className="font-medium">{entry.title}</p>
                  <p className="text-xs text-white/60">{entry.entry_type}</p>
                  <p className="text-white/75 line-clamp-3">{entry.content}</p>
                  {entry.source_id ? <p className="text-xs text-white/50">Source: {entry.source_id}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/70">No project knowledge yet.</p>
          )}
        </article>
      </section>
    </main>
  );
}

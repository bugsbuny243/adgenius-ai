import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';
import { addProjectKnowledgeAction, createProjectItemAction } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin');

  const { workspaceId, userId } = await getWorkspaceContext();

  const createItem = createProjectItemAction.bind(null, id);
  const addProjectKnowledge = addProjectKnowledgeAction.bind(null, id);

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, description, created_at')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const [{ data: items }, { data: outputs }, { data: knowledgeEntries }] = await Promise.all([
    supabase
      .from('project_items')
      .select('id, item_type, title, payload, source_output_id, saved_output_id, created_at')
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
      .select('id, title, content, entry_type, created_at')
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
                  {item.source_output_id || item.saved_output_id ? (
                    <p className="text-xs text-white/50">From output: {item.source_output_id ?? item.saved_output_id}</p>
                  ) : null}
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
        <article className="panel lg:col-span-2">
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
            <button type="submit" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-neon">
              Save knowledge
            </button>
          </form>
        </article>

        <article className="panel lg:col-span-2">
          <h3 className="mb-3 text-lg font-semibold">Project Knowledge</h3>
          {knowledgeEntries && knowledgeEntries.length > 0 ? (
            <div className="space-y-2 text-sm">
              {knowledgeEntries.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-white/10 px-3 py-2">
                  <p className="font-medium">{entry.title}</p>
                  <p className="text-white/70">{entry.content}</p>
                  <p className="text-xs text-white/60">{entry.entry_type}</p>
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

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Nav } from '@/components/nav';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';

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
    const content = String(formData.get('content') ?? '').trim();

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
      title,
      content: content || null
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

  const [{ data: items }, { data: outputs }] = await Promise.all([
    supabase
      .from('project_items')
      .select('id, title, content, status, created_at')
      .eq('project_id', project.id)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),
    supabase
      .from('saved_outputs')
      .select('id, title, content, created_at, agent_runs(status)')
      .eq('project_id', project.id)
      .eq('workspace_id', workspaceId)
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
            name="content"
            placeholder="Item details"
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
                  <p className="text-sm text-white/70">{item.content || 'No details.'}</p>
                  <p className="text-xs text-white/50">Status: {item.status}</p>
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
    </main>
  );
}

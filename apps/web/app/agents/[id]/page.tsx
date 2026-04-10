import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Nav } from '@/components/nav';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';

type AgentDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ run_id?: string; error?: string }>;
};

function asStringArray(raw: FormDataEntryValue[] | null | undefined) {
  return (raw ?? []).map((value) => String(value).trim()).filter(Boolean);
}

export default async function AgentDetailPage({ params, searchParams }: AgentDetailPageProps) {
  const { id } = await params;
  const { run_id: runIdParam, error: errorParam } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { workspaceId, userId } = await getWorkspaceContext();

  async function runAgent(formData: FormData) {
    'use server';

    const prompt = String(formData.get('prompt') ?? '').trim();
    const projectIdRaw = String(formData.get('project_id') ?? '').trim();
    const selectedProjectId = projectIdRaw || null;
    const selectedMemoryEntryIds = asStringArray(formData.getAll('workspace_memory_entry_ids'));
    const selectedProjectKnowledgeIds = asStringArray(formData.getAll('project_knowledge_entry_ids'));
    const selectedSourceIds = asStringArray(formData.getAll('source_ids'));
    const selectedSavedOutputIds = asStringArray(formData.getAll('saved_output_ids'));

    if (!prompt) {
      redirect(`/agents/${id}?error=Prompt is required.`);
    }

    const serverSupabase = await createSupabaseServerClient();
    const {
      data: { user: currentUser }
    } = await serverSupabase.auth.getUser();

    if (!currentUser) redirect('/login');

    const { workspaceId: currentWorkspaceId, userId: currentUserId } = await getWorkspaceContext();

    const { data: agent, error: agentError } = await serverSupabase
      .from('agent_types')
      .select('id')
      .eq('id', id)
      .or(`workspace_id.eq.${currentWorkspaceId},workspace_id.is.null`)
      .eq('is_active', true)
      .maybeSingle();

    if (agentError || !agent) {
      redirect(`/agents/${id}?error=Agent not found or unavailable.`);
    }

    if (selectedProjectId) {
      const { data: project, error: projectError } = await serverSupabase
        .from('projects')
        .select('id')
        .eq('id', selectedProjectId)
        .eq('workspace_id', currentWorkspaceId)
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (projectError || !project) {
        redirect(`/agents/${id}?error=Selected project is invalid for this workspace.`);
      }
    }

    const { data, error } = await serverSupabase.functions.invoke('gemini-orchestrator', {
      body: {
        workspaceId: currentWorkspaceId,
        userId: currentUser.id,
        agentTypeId: id,
        projectId: selectedProjectId,
        userInput: prompt,
        metadata: {
          source: 'agents-detail-page'
        },
        contextSelection: {
          workspaceMemoryEntryIds: selectedMemoryEntryIds,
          projectKnowledgeEntryIds: selectedProjectKnowledgeIds,
          sourceIds: selectedSourceIds,
          savedOutputIds: selectedSavedOutputIds
        },
        saveOutput: true
      }
    });

    if (error || !data?.ok || !data?.runId) {
      const message = data?.error || error?.message || 'Failed to run agent.';
      redirect(`/agents/${id}?error=${encodeURIComponent(message)}`);
    }

    revalidatePath('/dashboard');
    revalidatePath('/projects');
    if (selectedProjectId) {
      revalidatePath(`/projects/${selectedProjectId}`);
    }

    redirect(`/agents/${id}?run_id=${data.runId}`);
  }

  async function saveOutput(formData: FormData) {
    'use server';

    const runId = String(formData.get('run_id') ?? '').trim();
    if (!runId) return;

    const serverSupabase = await createSupabaseServerClient();
    const {
      data: { user: currentUser }
    } = await serverSupabase.auth.getUser();

    if (!currentUser) redirect('/login');

    const { workspaceId: currentWorkspaceId, userId: currentUserId } = await getWorkspaceContext();

    const { data: run } = await serverSupabase
      .from('agent_runs')
      .select('id, result_text, project_id')
      .eq('id', runId)
      .eq('workspace_id', currentWorkspaceId)
      .eq('user_id', currentUserId)
      .eq('status', 'completed')
      .maybeSingle();

    if (!run?.result_text) {
      redirect(`/agents/${id}?error=Run result is not available to save.`);
    }

    await serverSupabase.from('saved_outputs').insert({
      workspace_id: currentWorkspaceId,
      user_id: currentUser.id,
      agent_run_id: run.id,
      project_id: run.project_id,
      title: 'Saved output',
      content: run.result_text,
      metadata: { source: 'manual-save' }
    });

    if (run.project_id) {
      revalidatePath(`/projects/${run.project_id}`);
    }
    revalidatePath('/dashboard');
    redirect(`/agents/${id}?run_id=${runId}`);
  }

  async function createProjectItem(formData: FormData) {
    'use server';

    const outputId = String(formData.get('output_id') ?? '').trim();
    const title = String(formData.get('title') ?? '').trim();

    if (!outputId || !title) return;

    const serverSupabase = await createSupabaseServerClient();
    const {
      data: { user: currentUser }
    } = await serverSupabase.auth.getUser();

    if (!currentUser) redirect('/login');

    const { workspaceId: currentWorkspaceId, userId: currentUserId } = await getWorkspaceContext();

    const { data: output } = await serverSupabase
      .from('saved_outputs')
      .select('id, project_id, content')
      .eq('id', outputId)
      .eq('workspace_id', currentWorkspaceId)
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (!output?.project_id) {
      redirect(`/agents/${id}?error=Pick a project before converting to a project item.`);
    }

    const { data: item } = await serverSupabase
      .from('project_items')
      .insert({
        workspace_id: currentWorkspaceId,
        project_id: output.project_id,
        user_id: currentUser.id,
        source_output_id: output.id,
        item_type: 'agent_output',
        title,
        status: 'open',
        payload: { excerpt: output.content.slice(0, 400) }
      })
      .select('id, project_id')
      .single();

    if (item) {
      await serverSupabase.from('saved_outputs').update({ project_item_id: item.id }).eq('id', output.id);
      revalidatePath(`/projects/${item.project_id}`);
    }

    redirect(`/agents/${id}?run_id=${runIdParam ?? ''}`);
  }

  const [{ data: agent }, { data: projects }, { data: memoryEntries }, { data: recentSources }, { data: recentOutputs }] = await Promise.all([
    supabase
      .from('agent_types')
      .select('id, key, name, description, model_name, is_active')
      .eq('id', id)
      .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
      .maybeSingle(),
    supabase
      .from('projects')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('workspace_memory_entries')
      .select('id, title, entry_type')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('knowledge_sources')
      .select('id, title, source_type, project_id')
      .eq('workspace_id', workspaceId)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('saved_outputs')
      .select('id, title, project_id, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(20)
  ]);

  if (!agent) notFound();

  const { data: latestRun } = await supabase
    .from('agent_runs')
    .select('id, status, user_input, result_text, error_message, project_id, context_snapshot_id, created_at')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('agent_type_id', id)
    .eq(runIdParam ? 'id' : 'status', runIdParam || 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: savedOutput }, { data: latestRunContextLinks }, { data: projectKnowledge }] = await Promise.all([
    latestRun
      ? supabase
          .from('saved_outputs')
          .select('id, title, project_id, project_item_id, created_at')
          .eq('agent_run_id', latestRun.id)
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    latestRun
      ? supabase
          .from('run_context_sources')
          .select('id, source_id, saved_output_id, project_item_id, role')
          .eq('workspace_id', workspaceId)
          .eq('agent_run_id', latestRun.id)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase
      .from('project_knowledge_entries')
      .select('id, title, project_id, entry_type')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(20)
  ]);

  return (
    <main>
      <Nav />
      <section className="panel mb-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{agent.name}</h2>
            <p className="text-sm text-white/60">Key: {agent.key}</p>
            <p className="text-sm text-white/60">Model: {agent.model_name}</p>
            <p className="mt-2 text-sm text-white/75">{agent.description || 'No description yet.'}</p>
          </div>
          <Link href="/agents" className="rounded-lg border border-white/20 px-3 py-2 text-sm">
            Back to Agents
          </Link>
        </div>

        <form action={runAgent} className="space-y-3">
          <textarea
            name="prompt"
            rows={7}
            required
            placeholder="What should this agent help you with?"
            className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
          />
          <div className="flex flex-wrap items-center gap-3">
            <select
              name="project_id"
              defaultValue=""
              className="min-w-64 rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
            >
              <option value="">No project selected</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink">
              Run agent
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-white/70">Workspace memory</span>
              <select
                name="workspace_memory_entry_ids"
                multiple
                className="h-32 w-full rounded-lg border border-white/20 bg-black/30 px-2 py-2 text-sm outline-none focus:border-neon"
              >
                {memoryEntries?.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title} ({entry.entry_type})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-white/70">Project knowledge entries</span>
              <select
                name="project_knowledge_entry_ids"
                multiple
                className="h-32 w-full rounded-lg border border-white/20 bg-black/30 px-2 py-2 text-sm outline-none focus:border-neon"
              >
                {projectKnowledge?.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title} ({entry.entry_type})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-white/70">Sources</span>
              <select
                name="source_ids"
                multiple
                className="h-32 w-full rounded-lg border border-white/20 bg-black/30 px-2 py-2 text-sm outline-none focus:border-neon"
              >
                {recentSources?.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.title} ({source.source_type})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-white/70">Saved outputs</span>
              <select
                name="saved_output_ids"
                multiple
                className="h-32 w-full rounded-lg border border-white/20 bg-black/30 px-2 py-2 text-sm outline-none focus:border-neon"
              >
                {recentOutputs?.map((output) => (
                  <option key={output.id} value={output.id}>
                    {(output.title || 'Saved output').slice(0, 70)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-white/50">Tip: hold Ctrl/Cmd to select multiple context items.</p>
        </form>

        {errorParam ? <p className="mt-3 text-sm text-red-300">Error: {errorParam}</p> : null}
      </section>

      <section className="panel">
        <h3 className="mb-3 text-lg font-semibold">Latest Result</h3>
        {latestRun ? (
          <div className="space-y-3">
            <p className="text-xs text-white/60">
              Run {latestRun.id} • {latestRun.status} • {new Date(latestRun.created_at).toLocaleString()}
            </p>
            {latestRun.context_snapshot_id ? <p className="text-xs text-white/50">Context snapshot: {latestRun.context_snapshot_id}</p> : null}
            {latestRun.user_input ? (
              <div>
                <p className="text-sm font-medium">Input</p>
                <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">{latestRun.user_input}</p>
              </div>
            ) : null}
            {latestRun.result_text ? (
              <div>
                <p className="text-sm font-medium">Output</p>
                <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                  {latestRun.result_text}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-red-300">{latestRun.error_message || 'Run did not return output.'}</p>
            )}

            {latestRunContextLinks && latestRunContextLinks.length > 0 ? (
              <div className="rounded-lg border border-white/10 px-3 py-3">
                <p className="text-sm font-medium">Linked Context Sources</p>
                <div className="mt-2 space-y-1 text-xs text-white/60">
                  {latestRunContextLinks.map((link) => (
                    <p key={link.id}>
                      {link.role} • source:{link.source_id || '-'} • output:{link.saved_output_id || '-'} • item:{link.project_item_id || '-'}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            {latestRun.status === 'completed' && latestRun.result_text ? (
              <div className="space-y-3 rounded-lg border border-white/10 px-3 py-3">
                <p className="text-sm text-white/75">Saved output: {savedOutput ? 'available' : 'not yet saved'}</p>
                {!savedOutput ? (
                  <form action={saveOutput}>
                    <input type="hidden" name="run_id" value={latestRun.id} />
                    <button type="submit" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-neon">
                      Save output
                    </button>
                  </form>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-white/60">Saved output ID: {savedOutput.id}</p>
                    {savedOutput.project_id ? (
                      <p className="text-xs text-white/60">Linked project: {savedOutput.project_id}</p>
                    ) : (
                      <p className="text-xs text-yellow-200">This output is not linked to a project yet.</p>
                    )}
                    {savedOutput.project_id ? (
                      <form action={createProjectItem} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="output_id" value={savedOutput.id} />
                        <input
                          name="title"
                          required
                          placeholder="Project item title"
                          className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neon"
                        />
                        <button type="submit" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-neon">
                          Convert to project item
                        </button>
                        <Link href={`/projects/${savedOutput.project_id}`} className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-neon">
                          View project
                        </Link>
                      </form>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-white/70">No runs yet for this agent.</p>
        )}
      </section>
    </main>
  );
}

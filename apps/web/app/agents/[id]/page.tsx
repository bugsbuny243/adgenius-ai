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

function previewText(value: string | null | undefined, max = 140) {
  if (!value) return '';
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max)}…` : normalized;
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

  async function attachSavedOutputToProject(formData: FormData) {
    'use server';

    const outputId = String(formData.get('output_id') ?? '').trim();
    const projectId = String(formData.get('project_id') ?? '').trim();

    if (!outputId || !projectId) {
      redirect(`/agents/${id}?error=Select a project to attach this output.`);
    }

    const serverSupabase = await createSupabaseServerClient();
    const {
      data: { user: currentUser }
    } = await serverSupabase.auth.getUser();

    if (!currentUser) redirect('/login');

    const { workspaceId: currentWorkspaceId, userId: currentUserId } = await getWorkspaceContext();

    const [{ data: output }, { data: project }] = await Promise.all([
      serverSupabase
        .from('saved_outputs')
        .select('id, project_id')
        .eq('id', outputId)
        .eq('workspace_id', currentWorkspaceId)
        .eq('user_id', currentUserId)
        .maybeSingle(),
      serverSupabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('workspace_id', currentWorkspaceId)
        .eq('user_id', currentUserId)
        .maybeSingle()
    ]);

    if (!output || !project) {
      redirect(`/agents/${id}?error=Output or project is not valid for this workspace.`);
    }

    if (output.project_id && output.project_id !== projectId) {
      redirect(`/agents/${id}?error=This output is already linked to a different project.`);
    }

    await serverSupabase.from('saved_outputs').update({ project_id: projectId }).eq('id', outputId);

    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);
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

  const latestRunQuery = supabase
    .from('agent_runs')
    .select('id, status, user_input, result_text, error_message, project_id, context_snapshot_id, created_at')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('agent_type_id', id)
    .order('created_at', { ascending: false })
    .limit(1);

  const { data: latestRun } = runIdParam ? await latestRunQuery.eq('id', runIdParam).maybeSingle() : await latestRunQuery.maybeSingle();

  const [{ data: savedOutput }, { data: latestRunContextLinks }, { data: projectKnowledge }, { data: recentRuns }] = await Promise.all([
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
      .limit(20),
    supabase
      .from('agent_runs')
      .select('id, status, user_input, result_text, error_message, created_at, project_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('agent_type_id', id)
      .order('created_at', { ascending: false })
      .limit(12)
  ]);

  const recentRunIds = (recentRuns ?? []).map((run) => run.id);
  const [{ data: recentRunOutputs }, { data: workspaceProjects }] = await Promise.all([
    recentRunIds.length
      ? supabase
          .from('saved_outputs')
          .select('id, agent_run_id, project_id')
          .eq('workspace_id', workspaceId)
          .in('agent_run_id', recentRunIds)
      : Promise.resolve({ data: [] }),
    supabase.from('projects').select('id, name').eq('workspace_id', workspaceId).eq('user_id', userId)
  ]);

  const outputByRunId = new Map((recentRunOutputs ?? []).map((output) => [output.agent_run_id, output]));
  const projectNameById = new Map((workspaceProjects ?? []).map((project) => [project.id, project.name]));

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
            <label className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm">
              <span className="mb-1 block text-sm font-medium text-white">Workspace Memory</span>
              <span className="mb-2 block text-xs text-white/60">
                Reusable workspace-level facts and preferences. {memoryEntries?.length ?? 0} available.
              </span>
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
              {!memoryEntries?.length ? <span className="mt-2 block text-xs text-white/50">No workspace memory entries yet.</span> : null}
            </label>

            <label className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm">
              <span className="mb-1 block text-sm font-medium text-white">Project Knowledge</span>
              <span className="mb-2 block text-xs text-white/60">
                Structured notes and extracted knowledge. {projectKnowledge?.length ?? 0} available.
              </span>
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
              {!projectKnowledge?.length ? <span className="mt-2 block text-xs text-white/50">No project knowledge entries found.</span> : null}
            </label>

            <label className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm">
              <span className="mb-1 block text-sm font-medium text-white">Sources</span>
              <span className="mb-2 block text-xs text-white/60">
                Ready source docs and URLs for retrieval. {recentSources?.length ?? 0} available.
              </span>
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
              {!recentSources?.length ? <span className="mt-2 block text-xs text-white/50">No ready sources available yet.</span> : null}
            </label>

            <label className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm">
              <span className="mb-1 block text-sm font-medium text-white">Previous Outputs</span>
              <span className="mb-2 block text-xs text-white/60">
                Reuse earlier saved outputs as context. {recentOutputs?.length ?? 0} available.
              </span>
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
              {!recentOutputs?.length ? <span className="mt-2 block text-xs text-white/50">No saved outputs in this workspace yet.</span> : null}
            </label>
          </div>
          <p className="text-xs text-white/50">Tip: hold Ctrl/Cmd to select multiple context items.</p>
        </form>

        {errorParam ? <p className="mt-3 text-sm text-red-300">Error: {errorParam}</p> : null}
      </section>

      <section className="panel">
        <h3 className="mb-3 text-lg font-semibold">Recent Runs</h3>
        {recentRuns && recentRuns.length > 0 ? (
          <div className="space-y-2">
            {recentRuns.map((run) => {
              const linkedOutput = outputByRunId.get(run.id);
              const linkedProjectTitle = run.project_id ? projectNameById.get(run.project_id) || run.project_id : null;
              const outputProjectTitle = linkedOutput?.project_id ? projectNameById.get(linkedOutput.project_id) || linkedOutput.project_id : null;
              const active = latestRun?.id === run.id;

              return (
                <div key={run.id} className={`rounded-lg border px-3 py-3 ${active ? 'border-neon/80 bg-neon/5' : 'border-white/10'}`}>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-white/60">
                      {new Date(run.created_at).toLocaleString()} • {run.status}
                    </p>
                    {active ? (
                      <span className="rounded border border-neon/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neon">Viewing</span>
                    ) : (
                      <Link href={`/agents/${id}?run_id=${run.id}`} className="text-xs text-neon hover:underline">
                        View run
                      </Link>
                    )}
                  </div>
                  <p className="text-sm text-white/80">
                    <span className="text-white/60">Input:</span> {previewText(run.user_input) || '—'}
                  </p>
                  <p className="mt-1 text-sm text-white/80">
                    <span className="text-white/60">{run.result_text ? 'Result:' : 'Error:'}</span> {previewText(run.result_text || run.error_message) || '—'}
                  </p>
                  <p className="mt-1 text-xs text-white/55">
                    Saved output: {linkedOutput ? 'yes' : 'no'} • Project: {linkedProjectTitle || outputProjectTitle || 'none'}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-white/70">No recent runs yet for this agent.</p>
        )}
      </section>

      <section className="panel mt-4">
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
                    {!savedOutput.project_id ? (
                      <form action={attachSavedOutputToProject} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="output_id" value={savedOutput.id} />
                        <select
                          name="project_id"
                          defaultValue=""
                          required
                          className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neon"
                        >
                          <option value="">Attach to project…</option>
                          {projects?.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-neon">
                          Attach output to project
                        </button>
                      </form>
                    ) : null}
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

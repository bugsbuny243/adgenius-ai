'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';

function asStringArray(raw: FormDataEntryValue[] | null | undefined) {
  return (raw ?? []).map((value) => String(value).trim()).filter(Boolean);
}

export async function runAgentAction(agentId: string, formData: FormData) {
  const prompt = String(formData.get('prompt') ?? '').trim();
  const projectIdRaw = String(formData.get('project_id') ?? '').trim();
  const selectedProjectId = projectIdRaw || null;
  const selectedMemoryEntryIds = asStringArray(formData.getAll('workspace_memory_entry_ids'));
  const selectedProjectKnowledgeIds = asStringArray(formData.getAll('project_knowledge_entry_ids'));
  const selectedSourceIds = asStringArray(formData.getAll('source_ids'));
  const selectedSavedOutputIds = asStringArray(formData.getAll('saved_output_ids'));

  if (!prompt) {
    redirect(`/agents/${agentId}?error=Prompt is required.`);
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
    .eq('id', agentId)
    .or(`workspace_id.eq.${currentWorkspaceId},workspace_id.is.null`)
    .eq('is_active', true)
    .maybeSingle();

  if (agentError || !agent) {
    redirect(`/agents/${agentId}?error=Agent not found or unavailable.`);
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
      redirect(`/agents/${agentId}?error=Selected project is invalid for this workspace.`);
    }
  }

  const { data, error } = await serverSupabase.functions.invoke('gemini-orchestrator', {
    body: {
      workspaceId: currentWorkspaceId,
      userId: currentUser.id,
      agentTypeId: agentId,
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
    redirect(`/agents/${agentId}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/dashboard');
  revalidatePath('/projects');
  if (selectedProjectId) {
    revalidatePath(`/projects/${selectedProjectId}`);
  }

  redirect(`/agents/${agentId}?run_id=${data.runId}`);
}

export async function saveOutputAction(agentId: string, formData: FormData) {
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
    redirect(`/agents/${agentId}?error=Run result is not available to save.`);
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
  redirect(`/agents/${agentId}?run_id=${runId}`);
}

export async function createProjectItemFromOutputAction(agentId: string, runIdParam: string, formData: FormData) {
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
    redirect(`/agents/${agentId}?error=Pick a project before converting to a project item.`);
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

  redirect(`/agents/${agentId}?run_id=${runIdParam}`);
}

export async function attachSavedOutputToProjectAction(agentId: string, runIdParam: string, formData: FormData) {
  const outputId = String(formData.get('output_id') ?? '').trim();
  const projectId = String(formData.get('project_id') ?? '').trim();

  if (!outputId || !projectId) {
    redirect(`/agents/${agentId}?error=Select a project to attach this output.`);
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
    redirect(`/agents/${agentId}?error=Output or project is not valid for this workspace.`);
  }

  if (output.project_id && output.project_id !== projectId) {
    redirect(`/agents/${agentId}?error=This output is already linked to a different project.`);
  }

  await serverSupabase.from('saved_outputs').update({ project_id: projectId }).eq('id', outputId);

  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
  redirect(`/agents/${agentId}?run_id=${runIdParam}`);
}

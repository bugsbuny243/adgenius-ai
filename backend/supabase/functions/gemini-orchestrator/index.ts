import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

type OrchestratorPayload = {
  workspaceId?: string;
  userId?: string;
  agentTypeId?: string;
  projectId?: string;
  modelName?: string;
  userInput?: string;
  metadata?: Record<string, unknown>;
  saveOutput?: boolean;
  contextSelection?: {
    workspaceMemoryEntryIds?: string[];
    projectKnowledgeEntryIds?: string[];
    sourceIds?: string[];
    savedOutputIds?: string[];
  };
};

type AuthenticatedUser = {
  id: string;
};

function normalizeIds(ids: string[] | undefined) {
  return [...new Set((ids ?? []).map((id) => id.trim()).filter(Boolean))];
}

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function parseBearerToken(authHeader: string | null) {
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token.trim();
}

async function resolveAuthenticatedUser(req: Request): Promise<AuthenticatedUser | null> {
  const token = parseBearerToken(req.headers.get('authorization'));
  if (!token) return null;

  const authClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  const {
    data: { user },
    error
  } = await authClient.auth.getUser();

  if (error || !user) {
    return null;
  }

  return { id: user.id };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Only POST is supported' });
  }

  const authenticatedUser = await resolveAuthenticatedUser(req);
  if (!authenticatedUser) {
    return jsonResponse(401, { ok: false, error: 'Authentication required' });
  }

  let body: OrchestratorPayload;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { ok: false, error: 'Invalid JSON payload' });
  }

  const workspaceId = body.workspaceId?.trim();
  const requestedUserId = body.userId?.trim();
  const agentTypeId = body.agentTypeId?.trim();
  const projectId = body.projectId?.trim() || null;
  const userInput = body.userInput?.trim();
  const metadata = body.metadata ?? {};
  const saveOutput = body.saveOutput ?? true;
  const workspaceMemoryEntryIds = normalizeIds(body.contextSelection?.workspaceMemoryEntryIds);
  const projectKnowledgeEntryIds = normalizeIds(body.contextSelection?.projectKnowledgeEntryIds);
  const sourceIds = normalizeIds(body.contextSelection?.sourceIds);
  const savedOutputIds = normalizeIds(body.contextSelection?.savedOutputIds);

  if (!workspaceId || !agentTypeId || !userInput) {
    return jsonResponse(400, {
      ok: false,
      error: 'workspaceId, agentTypeId and userInput are required'
    });
  }

  if (requestedUserId && requestedUserId !== authenticatedUser.id) {
    return jsonResponse(403, { ok: false, error: 'userId does not match authenticated user' });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', authenticatedUser.id)
    .maybeSingle();

  if (membershipError) {
    return jsonResponse(500, { ok: false, error: 'Failed to verify workspace membership' });
  }

  if (!membership) {
    return jsonResponse(403, { ok: false, error: 'User is not authorized for workspace' });
  }

  if (projectId) {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (projectError) {
      return jsonResponse(500, { ok: false, error: 'Failed to validate project access' });
    }

    if (!project) {
      return jsonResponse(403, { ok: false, error: 'Project does not belong to workspace' });
    }
  }

  const { data: agentType, error: agentTypeError } = await supabase
    .from('agent_types')
    .select('id, workspace_id, model_name, is_active')
    .eq('id', agentTypeId)
    .eq('is_active', true)
    .maybeSingle();

  if (agentTypeError) {
    return jsonResponse(500, { ok: false, error: 'Failed to validate agent type' });
  }

  if (!agentType || (agentType.workspace_id !== null && agentType.workspace_id !== workspaceId)) {
    return jsonResponse(403, { ok: false, error: 'Agent type is unavailable for workspace' });
  }

  const modelName = agentType.model_name?.trim() || 'default';

  const [memoryResult, knowledgeResult, sourceResult, outputResult] = await Promise.all([
    workspaceMemoryEntryIds.length
      ? supabase
          .from('workspace_memory_entries')
          .select('id, title, content, entry_type, priority')
          .eq('workspace_id', workspaceId)
          .eq('is_active', true)
          .in('id', workspaceMemoryEntryIds)
      : Promise.resolve({ data: [], error: null }),
    projectKnowledgeEntryIds.length
      ? supabase
          .from('project_knowledge_entries')
          .select('id, title, content, entry_type, source_id')
          .eq('workspace_id', workspaceId)
          .in('id', projectKnowledgeEntryIds)
      : Promise.resolve({ data: [], error: null }),
    sourceIds.length
      ? supabase
          .from('knowledge_sources')
          .select('id, title, raw_text, source_type, source_url, project_id')
          .eq('workspace_id', workspaceId)
          .in('id', sourceIds)
      : Promise.resolve({ data: [], error: null }),
    savedOutputIds.length
      ? supabase
          .from('saved_outputs')
          .select('id, title, content, project_id, project_item_id')
          .eq('workspace_id', workspaceId)
          .in('id', savedOutputIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (memoryResult.error || knowledgeResult.error || sourceResult.error || outputResult.error) {
    return jsonResponse(500, { ok: false, error: 'Failed to load selected context.' });
  }

  const memoryEntries = memoryResult.data ?? [];
  const knowledgeEntries = knowledgeResult.data ?? [];
  const selectedSources = sourceResult.data ?? [];
  const selectedOutputs = outputResult.data ?? [];

  if (
    memoryEntries.length !== workspaceMemoryEntryIds.length ||
    knowledgeEntries.length !== projectKnowledgeEntryIds.length ||
    selectedSources.length !== sourceIds.length ||
    selectedOutputs.length !== savedOutputIds.length
  ) {
    return jsonResponse(403, { ok: false, error: 'One or more selected context records are invalid for this workspace' });
  }

  const assembledContext = {
    workspaceMemory: memoryEntries,
    projectKnowledge: knowledgeEntries,
    sources: selectedSources.map((source) => ({
      id: source.id,
      title: source.title,
      sourceType: source.source_type,
      sourceUrl: source.source_url,
      rawText: source.raw_text
    })),
    savedOutputs: selectedOutputs
  };

  const systemInstruction =
    'You are a workspace-aware agent. Use provided workspace memory, project knowledge, sources, and saved outputs when they are relevant and prefer them over generic assumptions.';

  const { data: snapshot, error: snapshotError } = await supabase
    .from('context_snapshots')
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      agent_type_id: agentTypeId,
      user_id: authenticatedUser.id,
      input_text: userInput,
      assembled_context: assembledContext,
      system_instruction: systemInstruction
    })
    .select('id')
    .single();

  if (snapshotError || !snapshot) {
    return jsonResponse(500, { ok: false, error: snapshotError?.message ?? 'Failed to create context snapshot' });
  }

  const { data: run, error: runError } = await supabase
    .from('agent_runs')
    .insert({
      workspace_id: workspaceId,
      user_id: authenticatedUser.id,
      agent_type_id: agentTypeId,
      project_id: projectId,
      context_snapshot_id: snapshot.id,
      model_name: modelName,
      status: 'running',
      user_input: userInput,
      metadata,
      tokens_input: 0,
      tokens_output: 0
    })
    .select('id')
    .single();

  if (runError || !run) {
    return jsonResponse(500, { ok: false, error: runError?.message ?? 'Failed to create run' });
  }

  const runContextRows = [
    ...selectedSources.map((source) => ({
      workspace_id: workspaceId,
      agent_run_id: run.id,
      context_snapshot_id: snapshot.id,
      source_id: source.id,
      role: 'knowledge_source'
    })),
    ...selectedOutputs.map((output) => ({
      workspace_id: workspaceId,
      agent_run_id: run.id,
      context_snapshot_id: snapshot.id,
      saved_output_id: output.id,
      project_item_id: output.project_item_id,
      role: 'saved_output'
    })),
    ...knowledgeEntries
      .filter((entry) => entry.source_id)
      .map((entry) => ({
        workspace_id: workspaceId,
        agent_run_id: run.id,
        context_snapshot_id: snapshot.id,
        source_id: entry.source_id,
        role: 'project_knowledge_source'
      }))
  ];

  if (runContextRows.length > 0) {
    await supabase.from('run_context_sources').insert(runContextRows);
  }

  const contextText = [
    memoryEntries.length
      ? `Workspace memory:\n${memoryEntries.map((entry) => `- ${entry.title}: ${entry.content}`).join('\n')}`
      : null,
    knowledgeEntries.length
      ? `Project knowledge:\n${knowledgeEntries.map((entry) => `- ${entry.title}: ${entry.content}`).join('\n')}`
      : null,
    selectedSources.length
      ? `Sources:\n${selectedSources
          .map((source) => `- ${source.title}: ${(source.raw_text ?? '').slice(0, 1200)}`)
          .join('\n')}`
      : null,
    selectedOutputs.length
      ? `Saved outputs:\n${selectedOutputs.map((output) => `- ${output.title || output.id}: ${output.content}`).join('\n')}`
      : null
  ]
    .filter(Boolean)
    .join('\n\n');

  const geminiResponse = await fetch(`${GEMINI_URL}?key=${Deno.env.get('GEMINI_API_KEY')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: contextText
                ? `${contextText}\n\nUser request:\n${userInput}`
                : userInput
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.6,
        topP: 0.9
      }
    })
  });

  const payload = await geminiResponse.json();
  const resultText = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  const tokensInput = payload?.usageMetadata?.promptTokenCount ?? 0;
  const tokensOutput = payload?.usageMetadata?.candidatesTokenCount ?? 0;
  const totalTokens = payload?.usageMetadata?.totalTokenCount ?? tokensInput + tokensOutput;

  if (!geminiResponse.ok || !resultText) {
    const errorMessage = payload?.error?.message ?? 'AI request failed';

    await supabase
      .from('agent_runs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        metadata: { ...metadata, ai_error: payload },
        updated_at: new Date().toISOString()
      })
      .eq('id', run.id);

    return jsonResponse(502, { ok: false, error: errorMessage, runId: run.id });
  }

  await supabase
    .from('agent_runs')
    .update({
      status: 'completed',
      result_text: resultText,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      metadata: { ...metadata, ai_usage: payload?.usageMetadata ?? null, context_snapshot_id: snapshot.id },
      updated_at: new Date().toISOString()
    })
    .eq('id', run.id);

  if (saveOutput) {
    await supabase.from('saved_outputs').insert({
      workspace_id: workspaceId,
      user_id: authenticatedUser.id,
      agent_run_id: run.id,
      project_id: projectId,
      title: 'AI Output',
      content: resultText,
      metadata: { source: 'ai-orchestrator', context_snapshot_id: snapshot.id }
    });
  }

  await supabase.rpc('increment_usage_counters', {
    target_workspace_id: workspaceId,
    input_tokens: tokensInput,
    output_tokens: tokensOutput
  });

  await supabase.from('usage_metering').insert([
    {
      workspace_id: workspaceId,
      user_id: authenticatedUser.id,
      agent_run_id: run.id,
      metric: 'run',
      quantity: 1,
      metadata: { modelName }
    },
    {
      workspace_id: workspaceId,
      user_id: authenticatedUser.id,
      agent_run_id: run.id,
      metric: 'token_total',
      quantity: totalTokens,
      metadata: { modelName }
    }
  ]);

  return new Response(
    JSON.stringify({
      ok: true,
      runId: run.id,
      contextSnapshotId: snapshot.id,
      data: {
        resultText,
        tokensInput,
        tokensOutput,
        totalTokens
      }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
});

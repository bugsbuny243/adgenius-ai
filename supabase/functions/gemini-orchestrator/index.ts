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
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Only POST is supported' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const body: OrchestratorPayload = await req.json();
  const workspaceId = body.workspaceId?.trim();
  const userId = body.userId?.trim();
  const agentTypeId = body.agentTypeId?.trim();
  const projectId = body.projectId?.trim() || null;
  const modelName = body.modelName?.trim() || 'gemini-2.5-pro';
  const userInput = body.userInput?.trim();
  const metadata = body.metadata ?? {};
  const saveOutput = body.saveOutput ?? true;

  if (!workspaceId || !userId || !agentTypeId || !userInput) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'workspaceId, userId, agentTypeId and userInput are required'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

  const { data: run, error: runError } = await supabase
    .from('agent_runs')
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      agent_type_id: agentTypeId,
      project_id: projectId,
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
    return new Response(JSON.stringify({ ok: false, error: runError?.message ?? 'Failed to create run' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const geminiResponse = await fetch(`${GEMINI_URL}?key=${Deno.env.get('GEMINI_API_KEY')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: userInput }] }],
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
    const errorMessage = payload?.error?.message ?? 'Gemini request failed';

    await supabase
      .from('agent_runs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        metadata: { ...metadata, gemini_error: payload },
        updated_at: new Date().toISOString()
      })
      .eq('id', run.id);

    return new Response(JSON.stringify({ ok: false, error: errorMessage, runId: run.id }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  await supabase
    .from('agent_runs')
    .update({
      status: 'completed',
      result_text: resultText,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      metadata: { ...metadata, gemini_usage: payload?.usageMetadata ?? null },
      updated_at: new Date().toISOString()
    })
    .eq('id', run.id);

  if (saveOutput) {
    await supabase.from('saved_outputs').insert({
      workspace_id: workspaceId,
      user_id: userId,
      agent_run_id: run.id,
      project_id: projectId,
      title: 'Gemini Output',
      content: resultText,
      metadata: { source: 'gemini-orchestrator' }
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
      user_id: userId,
      agent_run_id: run.id,
      metric: 'run',
      quantity: 1,
      metadata: { modelName }
    },
    {
      workspace_id: workspaceId,
      user_id: userId,
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

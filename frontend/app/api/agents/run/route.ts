import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env';

type RunRequestBody = {
  runId?: string;
  agentTypeId?: string;
  userInput?: string;
  metadata?: Record<string, unknown>;
};

const RUN_TIMEOUT_MS = 40_000;

function getAccessToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice('Bearer '.length).trim() || null;
}

export async function POST(request: Request) {
  const {
    SUPABASE_URL: url,
    SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    GEMINI_API_KEY: modelApiKey
  } = getServerEnv();

  if (!url || !anonKey || !serviceRoleKey || !modelApiKey) {
    console.error('[agents/run] Required server environment is missing.');
    return NextResponse.json({ ok: false, error: 'missing_environment' }, { status: 500 });
  }

  const accessToken = getAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as RunRequestBody | null;
  const runId = body?.runId?.trim();
  const agentTypeId = body?.agentTypeId?.trim();
  const userInput = body?.userInput?.trim();
  const requestMetadata = body?.metadata ?? null;

  if (!runId || !agentTypeId || !userInput) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
  }

  const supabase = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  const serviceSupabase = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'invalid_user' }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership?.workspace_id) {
    return NextResponse.json({ ok: false, error: 'workspace_not_found' }, { status: 404 });
  }

  const { data: run } = await supabase
    .from('agent_runs')
    .select('id, workspace_id, user_id, agent_type_id, metadata')
    .eq('id', runId)
    .eq('workspace_id', membership.workspace_id)
    .eq('user_id', user.id)
    .eq('agent_type_id', agentTypeId)
    .maybeSingle();

  if (!run) {
    return NextResponse.json({ ok: false, error: 'run_not_found' }, { status: 404 });
  }

  const { data: agentType } = await supabase
    .from('agent_types')
    .select('id, system_prompt')
    .eq('id', agentTypeId)
    .eq('is_active', true)
    .maybeSingle();

  if (!agentType) {
    await serviceSupabase
      .from('agent_runs')
      .update({ status: 'failed', error_message: 'Agent bulunamadı.' })
      .eq('id', runId)
      .eq('user_id', user.id)
      .eq('workspace_id', membership.workspace_id);

    return NextResponse.json({ ok: false, error: 'agent_not_found' }, { status: 404 });
  }

  try {
    const client = new GoogleGenAI({ apiKey: modelApiKey });
    const response = await Promise.race([
      client.models.generateContent({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: agentType.system_prompt
        },
        contents: userInput
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('run_timeout')), RUN_TIMEOUT_MS);
      })
    ]);

    const resultText = response.text ?? '';
    const usage = response.usageMetadata;

    const { error: updateError } = await serviceSupabase
      .from('agent_runs')
      .update({
        result_text: resultText,
        status: 'completed',
        error_message: null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        model_name: 'default',
        tokens_input: usage?.promptTokenCount ?? null,
        tokens_output: usage?.candidatesTokenCount ?? null,
        metadata: {
          ...(run.metadata ?? {}),
          ...(requestMetadata ?? {}),
          ai_engine: 'Varsayılan AI motoru'
        }
      })
      .eq('id', runId)
      .eq('user_id', user.id)
      .eq('workspace_id', membership.workspace_id);

    if (updateError) {
      throw new Error(`run_update_failed:${updateError.message}`);
    }

    return NextResponse.json({ ok: true, runId, result: resultText });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';

    await serviceSupabase
      .from('agent_runs')
      .update({
        status: 'failed',
        error_message: message,
        updated_at: new Date().toISOString(),
        metadata: {
          ...(run.metadata ?? {}),
          ...(requestMetadata ?? {}),
          ai_engine: 'Varsayılan AI motoru'
        }
      })
      .eq('id', runId)
      .eq('user_id', user.id)
      .eq('workspace_id', membership.workspace_id);

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

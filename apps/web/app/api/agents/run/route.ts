import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

type RunRequestBody = {
  runId?: string;
  agentTypeId?: string;
  userInput?: string;
};

function getAccessToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice('Bearer '.length).trim() || null;
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const modelApiKey = process.env.GEMINI_API_KEY;

  if (!url || !anonKey || !modelApiKey) {
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
    .select('id, workspace_id, user_id, agent_type_id')
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
    await supabase
      .from('agent_runs')
      .update({ status: 'failed', error_message: 'Agent bulunamadı.' })
      .eq('id', runId)
      .eq('workspace_id', membership.workspace_id);

    return NextResponse.json({ ok: false, error: 'agent_not_found' }, { status: 404 });
  }

  try {
    const client = new GoogleGenAI({ apiKey: modelApiKey });
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: agentType.system_prompt
      },
      contents: userInput
    });

    const resultText = response.text ?? '';
    const usage = response.usageMetadata;

    await supabase
      .from('agent_runs')
      .update({
        result_text: resultText,
        status: 'completed',
        error_message: null,
        tokens_input: usage?.promptTokenCount ?? null,
        tokens_output: usage?.candidatesTokenCount ?? null
      })
      .eq('id', runId)
      .eq('workspace_id', membership.workspace_id);

    return NextResponse.json({ ok: true, runId, result: resultText });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';

    await supabase
      .from('agent_runs')
      .update({
        status: 'failed',
        error_message: message
      })
      .eq('id', runId)
      .eq('workspace_id', membership.workspace_id);

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

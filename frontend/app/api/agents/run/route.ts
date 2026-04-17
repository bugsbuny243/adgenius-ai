import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env';

type RunRequestBody = {
  runId?: string;
  agentTypeId?: string;
  userInput?: string;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
};

type Platform = 'youtube' | 'instagram' | 'tiktok';

const RUN_TIMEOUT_MS = 40_000;
const FALLBACK_ENGINE_NAME = 'AI motoru';

function normalizePlatforms(value: unknown): Platform[] {
  if (!Array.isArray(value)) {
    return ['youtube', 'instagram', 'tiktok'];
  }

  const normalized = value
    .map((entry) => String(entry).toLowerCase().trim())
    .filter((entry): entry is Platform => ['youtube', 'instagram', 'tiktok'].includes(entry));

  return normalized.length ? Array.from(new Set(normalized)) : ['youtube', 'instagram', 'tiktok'];
}

function getAccessToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice('Bearer '.length).trim() || null;
}

async function insertContentItemWithFallbacks(
  serviceSupabase: any,
  payload: {
    workspaceId: string;
    userId: string;
    runId: string;
    projectId: string | null;
    savedOutputId: string | null;
    brief: string;
    platforms: Platform[];
    resultText: string;
  }
): Promise<string | null> {
  const candidates = [
    {
      workspace_id: payload.workspaceId,
      user_id: payload.userId,
      project_id: payload.projectId,
      run_id: payload.runId,
      saved_output_id: payload.savedOutputId,
      status: 'draft',
      brief: payload.brief,
      platforms: payload.platforms,
      youtube_title: payload.resultText.slice(0, 90),
      youtube_description: payload.resultText,
      instagram_caption: payload.resultText.slice(0, 2200),
      tiktok_caption: payload.resultText.slice(0, 300)
    },
    {
      workspace_id: payload.workspaceId,
      user_id: payload.userId,
      project_id: payload.projectId,
      run_id: payload.runId,
      saved_output_id: payload.savedOutputId,
      brief: payload.brief,
      platforms: payload.platforms,
      youtube_title: payload.resultText.slice(0, 90),
      youtube_description: payload.resultText,
      instagram_caption: payload.resultText.slice(0, 2200),
      tiktok_caption: payload.resultText.slice(0, 300)
    },
    {
      workspace_id: payload.workspaceId,
      user_id: payload.userId,
      project_id: payload.projectId,
      source_run_id: payload.runId,
      source_output_id: payload.savedOutputId,
      brief: payload.brief,
      youtube_title: payload.resultText.slice(0, 90),
      youtube_description: payload.resultText,
      instagram_caption: payload.resultText.slice(0, 2200),
      tiktok_caption: payload.resultText.slice(0, 300)
    }
  ];

  for (const candidate of candidates) {
    const { data, error } = await (serviceSupabase.from('content_items') as any).insert(candidate).select('id').maybeSingle();
    if (!error && data?.id) {
      return data.id;
    }
  }

  return null;
}

async function insertPublishJobsWithFallbacks(
  serviceSupabase: any,
  payload: {
    workspaceId: string;
    projectId: string | null;
    contentItemId: string;
    brief: string;
    platforms: Platform[];
    resultText: string;
  }
) {
  for (const platform of payload.platforms) {
    const candidates = [
      {
        workspace_id: payload.workspaceId,
        project_id: payload.projectId,
        content_output_id: payload.contentItemId,
        target_platform: platform,
        status: 'queued',
        payload: {
          brief: payload.brief,
          platform,
          text: payload.resultText
        }
      },
      {
        workspace_id: payload.workspaceId,
        project_id: payload.projectId,
        content_output_id: payload.contentItemId,
        target_platform: platform,
        status: 'draft',
        queued_at: new Date().toISOString(),
        payload: {
          brief: payload.brief,
          platform,
          text: payload.resultText
        }
      }
    ];

    for (const candidate of candidates) {
      const { error } = await (serviceSupabase.from('publish_jobs') as any).insert(candidate);
      if (!error) {
        break;
      }
    }
  }
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
  const projectId = body?.projectId?.trim() || null;
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
    .select('id, workspace_id, user_id, agent_type_id, project_id, metadata, status, result_text, error_message')
    .eq('id', runId)
    .eq('workspace_id', membership.workspace_id)
    .eq('user_id', user.id)
    .eq('agent_type_id', agentTypeId)
    .maybeSingle();

  if (!run) {
    return NextResponse.json({ ok: false, error: 'run_not_found' }, { status: 404 });
  }

  if (run.status === 'completed' && run.result_text) {
    return NextResponse.json({ ok: true, runId, result: run.result_text, fromCache: true });
  }

  if (run.status === 'failed' && run.error_message) {
    return NextResponse.json({ ok: false, error: run.error_message }, { status: 409 });
  }

  const { data: agentType } = await supabase
    .from('agent_types')
    .select('id, slug, system_prompt')
    .eq('id', agentTypeId)
    .eq('is_active', true)
    .maybeSingle();

  if (!agentType) {
    await serviceSupabase
      .from('agent_runs')
      .update({
        status: 'failed',
        error_message: 'Agent bulunamadı.',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', runId)
      .eq('user_id', user.id)
      .eq('workspace_id', membership.workspace_id);

    return NextResponse.json({ ok: false, error: 'agent_not_found' }, { status: 404 });
  }

  try {
    await serviceSupabase
      .from('agent_runs')
      .update({
        status: 'processing',
        error_message: null,
        updated_at: new Date().toISOString(),
        metadata: {
          ...(run.metadata ?? {}),
          ...(requestMetadata ?? {}),
          ai_engine: FALLBACK_ENGINE_NAME
        }
      })
      .eq('id', runId)
      .eq('user_id', user.id)
      .eq('workspace_id', membership.workspace_id)
      .in('status', ['pending', 'processing']);

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

    const resultText = (response.text ?? '').trim();
    const usage = response.usageMetadata;

    if (!resultText) {
      throw new Error('empty_result');
    }

    const normalizedMetadata = {
      ...(run.metadata ?? {}),
      ...(requestMetadata ?? {}),
      ai_engine: FALLBACK_ENGINE_NAME
    };

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
        metadata: normalizedMetadata
      })
      .eq('id', runId)
      .eq('user_id', user.id)
      .eq('workspace_id', membership.workspace_id);

    if (updateError) {
      throw new Error(`run_update_failed:${updateError.message}`);
    }

    if (agentType.slug === 'sosyal') {
      const requestEditorState =
        requestMetadata && typeof requestMetadata === 'object' && 'editor_state' in requestMetadata
          ? (requestMetadata.editor_state as Record<string, unknown>)
          : null;
      const preferredPlatform =
        requestEditorState && typeof requestEditorState.platform === 'string' ? requestEditorState.platform.toLowerCase() : null;
      const platforms: Platform[] = preferredPlatform ? normalizePlatforms([preferredPlatform]) : ['youtube', 'instagram', 'tiktok'];

      const { data: savedOutput } = await serviceSupabase
        .from('saved_outputs')
        .insert({
          workspace_id: membership.workspace_id,
          user_id: user.id,
          project_id: run.project_id ?? projectId,
          agent_run_id: runId,
          title: 'Sosyal medya çıktısı',
          content: resultText
        })
        .select('id')
        .maybeSingle();

      const contentItemId = await insertContentItemWithFallbacks(serviceSupabase, {
        workspaceId: membership.workspace_id,
        userId: user.id,
        runId,
        projectId: run.project_id ?? projectId,
        savedOutputId: savedOutput?.id ?? null,
        brief: userInput,
        platforms,
        resultText
      });

      if (contentItemId) {
        await insertPublishJobsWithFallbacks(serviceSupabase, {
          workspaceId: membership.workspace_id,
          projectId: run.project_id ?? projectId,
          contentItemId,
          brief: userInput,
          platforms,
          resultText
        });
      }
    }

    return NextResponse.json({ ok: true, runId, result: resultText });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';

    await serviceSupabase
      .from('agent_runs')
      .update({
        status: 'failed',
        error_message: message,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          ...(run.metadata ?? {}),
          ...(requestMetadata ?? {}),
          ai_engine: FALLBACK_ENGINE_NAME
        }
      })
      .eq('id', runId)
      .eq('user_id', user.id)
      .eq('workspace_id', membership.workspace_id);

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

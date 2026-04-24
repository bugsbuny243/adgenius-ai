import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env';
import { runTextStreamWithAiEngine, runTextWithAiEngine } from '@/lib/ai-engine';
import {
  createSocialPublishPayload,
  normalizeSocialContentDraft,
  type SocialContentDraft,
  type SocialPlatform
} from '@/lib/social-content';

type RunRequestBody = {
  runId?: string;
  agentTypeId?: string;
  userInput?: string;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
};

const RUN_TIMEOUT_MS = 40_000;
const FALLBACK_ENGINE_NAME = 'Koschei AI motoru';
const QUOTA_ERROR_CODE = 'provider_quota_exceeded';
const QUOTA_ERROR_MESSAGE = 'Kullanım limiti dolduğu için çalışma başlatılamadı.';
const RATE_LIMIT_ERROR_CODE = 'provider_rate_limited';
const MOCK_FALLBACK_FLAG = process.env.MOCK_AI_ON_FAILURE === 'true';

function toRunFailureMessage(input: string): string {
  const code = input.trim().toLowerCase();
  if (code === QUOTA_ERROR_CODE) return QUOTA_ERROR_MESSAGE;
  if (code === RATE_LIMIT_ERROR_CODE) return 'Geçici servis yoğunluğu oluştu. Birkaç dakika sonra tekrar deneyin.';
  if (code === 'run_timeout') return 'Geçici servis yoğunluğu oluştu. Birkaç dakika sonra tekrar deneyin.';
  if (code === 'empty_result') return 'Çalışma tamamlanamadı. Geçerli bir sonuç üretilemedi.';
  if (code.startsWith('run_update_failed:')) return 'Çalışma tamamlanamadı. Sonuç kaydı yazılırken sorun oluştu.';
  return 'Çalışma tamamlanamadı. Lütfen birkaç dakika sonra tekrar deneyin.';
}

function isQuotaOrBillingFailure(input: string): boolean {
  const value = input.toLowerCase();
  return (
    value.includes('429') ||
    value.includes('too many requests') ||
    value.includes('resource_exhausted') ||
    value.includes('depleted credits') ||
    value.includes('billing') ||
    value.includes('rate limit') ||
    value.includes('insufficient_quota') ||
    value.includes('quota')
  );
}


function normalizeProviderError(input: unknown): string {
  const message = input instanceof Error ? input.message : String(input ?? 'run_failed');
  const normalized = message.trim().toLowerCase();
  if (!normalized) return 'run_failed';
  if (normalized === 'run_timeout') return 'run_timeout';
  if (normalized === 'empty_result') return 'empty_result';
  if (normalized.startsWith('run_update_failed:')) return normalized;
  if (normalized === RATE_LIMIT_ERROR_CODE) return RATE_LIMIT_ERROR_CODE;
  if (isQuotaOrBillingFailure(normalized) || normalized === QUOTA_ERROR_CODE) return QUOTA_ERROR_CODE;
  if (normalized.includes('too many requests') || normalized.includes('rate limit')) return RATE_LIMIT_ERROR_CODE;
  return 'run_failed';
}

function toSafeRuntimeErrorMessage(input: unknown): string {
  const raw = input instanceof Error ? input.message : String(input ?? '').trim();
  const normalized = raw.toLowerCase();

  if (!raw) return 'Çalıştırma sırasında beklenmeyen bir hata oluştu.';
  if (normalized === 'run_timeout' || normalized.includes('timeout') || normalized.includes('aborted')) {
    return 'Çalıştırma zaman aşımına uğradı.';
  }
  if (normalized === 'empty_result') {
    return 'AI motoru boş sonuç döndürdü.';
  }
  if (normalized.startsWith('run_update_failed:')) {
    return 'Çalışma tamamlanamadı. Sonuç kaydı yazılırken sorun oluştu.';
  }
  if (isQuotaOrBillingFailure(normalized) || normalized === QUOTA_ERROR_CODE) {
    return QUOTA_ERROR_MESSAGE;
  }
  if (normalized.includes('too many requests') || normalized.includes('rate limit') || normalized === RATE_LIMIT_ERROR_CODE) {
    return 'Geçici servis yoğunluğu oluştu. Birkaç dakika sonra tekrar deneyin.';
  }

  return 'Çalışma tamamlanamadı. Lütfen birkaç dakika sonra tekrar deneyin.';
}

function resolveWorkflowFieldsFromMetadata(metadata: unknown): {
  projectId: string | null;
  projectItemId: string | null;
  workflowMetadata: Record<string, unknown>;
} {
  if (!metadata || typeof metadata !== 'object') {
    return { projectId: null, projectItemId: null, workflowMetadata: {} };
  }

  const source = metadata as Record<string, unknown>;
  const projectId = typeof source.project_id === 'string' && source.project_id.trim() ? source.project_id.trim() : null;
  const projectItemId = typeof source.source_project_item_id === 'string' && source.source_project_item_id.trim() ? source.source_project_item_id.trim() : null;

  return {
    projectId,
    projectItemId,
    workflowMetadata: {
      workflow_type: source.workflow_type ?? null,
      source_project_item_id: source.source_project_item_id ?? null,
      parent_output_id: source.parent_output_id ?? null,
      revision_round: source.revision_round ?? null,
      target_item_type: source.target_item_type ?? null
    }
  };
}

async function upsertSavedOutputForRun(
  serviceSupabase: unknown,
  payload: {
    workspaceId: string;
    userId: string;
    runId: string;
    title: string;
    content: string;
    projectId: string | null;
    projectItemId: string | null;
    metadata: Record<string, unknown>;
  }
): Promise<string | null> {
  const db = serviceSupabase as {
    from: (table: string) => {
      select: (query: string) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => {
            eq: (column: string, value: string) => {
              order: (column: string, opts: { ascending: boolean }) => {
                limit: (count: number) => { maybeSingle: () => Promise<{ data: { id?: string } | null }> };
              };
            };
          };
        };
      };
      update: (value: unknown) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => {
            eq: (column: string, value: string) => Promise<unknown>;
          };
        };
      };
      insert: (value: unknown) => {
        select: (query: string) => { maybeSingle: () => Promise<{ data: { id?: string } | null }> };
      };
    };
  };

  const existing = await db
    .from('saved_outputs')
    .select('id')
    .eq('workspace_id', payload.workspaceId)
    .eq('user_id', payload.userId)
    .eq('agent_run_id', payload.runId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.data?.id) {
    await db
      .from('saved_outputs')
      .update({
        title: payload.title,
        content: payload.content,
        project_id: payload.projectId,
        project_item_id: payload.projectItemId,
        metadata: payload.metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.data.id)
      .eq('workspace_id', payload.workspaceId)
      .eq('user_id', payload.userId);
    return existing.data.id;
  }

  const inserted = await db
    .from('saved_outputs')
    .insert({
      workspace_id: payload.workspaceId,
      user_id: payload.userId,
      agent_run_id: payload.runId,
      project_id: payload.projectId,
      project_item_id: payload.projectItemId,
      title: payload.title,
      content: payload.content,
      metadata: payload.metadata
    })
    .select('id')
    .maybeSingle();

  return inserted.data?.id ?? null;
}


function normalizePlatforms(value: unknown): SocialPlatform[] {
  if (!Array.isArray(value)) {
    return ['youtube'];
  }

  const normalized = value
    .map((entry) => String(entry).toLowerCase().trim())
    .filter((entry): entry is SocialPlatform => ['youtube', 'instagram', 'tiktok'].includes(entry));

  return normalized.length ? Array.from(new Set(normalized)) : ['youtube'];
}

function getAccessToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice('Bearer '.length).trim() || null;
}

async function insertContentItemWithFallbacks(
  serviceSupabase: unknown,
  payload: {
    workspaceId: string;
    userId: string;
    runId: string;
    projectId: string | null;
    savedOutputId: string | null;
    draft: SocialContentDraft;
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
      brief: payload.draft.brief,
      platforms: payload.draft.platforms,
      youtube_title: payload.draft.youtubeTitle,
      youtube_description: payload.draft.youtubeDescription,
      instagram_caption: payload.draft.instagramCaption,
      tiktok_caption: payload.draft.tiktokCaption
    },
    {
      workspace_id: payload.workspaceId,
      user_id: payload.userId,
      project_id: payload.projectId,
      run_id: payload.runId,
      saved_output_id: payload.savedOutputId,
      brief: payload.draft.brief,
      platforms: payload.draft.platforms,
      youtube_title: payload.draft.youtubeTitle,
      youtube_description: payload.draft.youtubeDescription,
      instagram_caption: payload.draft.instagramCaption,
      tiktok_caption: payload.draft.tiktokCaption
    }
  ];

  for (const candidate of candidates) {
    const { data, error } = await ((serviceSupabase as { from: (table: string) => { insert: (value: unknown) => { select: (query: string) => { maybeSingle: () => Promise<{ data: { id?: string } | null; error: { message?: string } | null }> } } } }).from('content_items')).insert(candidate).select('id').maybeSingle();
    if (!error && data?.id) {
      return data.id;
    }
  }

  return null;
}

async function insertPublishJobsWithFallbacks(
  serviceSupabase: unknown,
  payload: {
    workspaceId: string;
    projectId: string | null;
    contentItemId: string;
    draft: SocialContentDraft;
  }
) {
  for (const platform of payload.draft.platforms) {
    const candidates = [
      {
        workspace_id: payload.workspaceId,
        project_id: payload.projectId,
        content_output_id: payload.contentItemId,
        target_platform: platform,
        status: 'queued',
        queued_at: new Date().toISOString(),
        payload: createSocialPublishPayload(payload.draft, platform)
      },
      {
        workspace_id: payload.workspaceId,
        project_id: payload.projectId,
        content_output_id: payload.contentItemId,
        target_platform: platform,
        status: 'draft',
        queued_at: new Date().toISOString(),
        payload: createSocialPublishPayload(payload.draft, platform)
      }
    ];

    for (const candidate of candidates) {
      const { error } = await ((serviceSupabase as { from: (table: string) => { insert: (value: unknown) => Promise<{ error: { message?: string } | null }> } }).from('publish_jobs')).insert(candidate);
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
    OPENAI_API_KEY: openAiApiKey
  } = getServerEnv();

  if (!url || !anonKey || !serviceRoleKey || !openAiApiKey) {
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
    await serviceSupabase
      .from('agent_runs')
      .update({
        status: 'failed',
        error_message: 'Çalışma alanı bulunamadı.',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', runId)
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing']);

    return NextResponse.json({ ok: false, error: 'workspace_not_found' }, { status: 404 });
  }

  const monthKey = new Date().toISOString().slice(0, 7);

  const [{ data: sub }, { data: counter }] = await Promise.all([
    supabase.from('subscriptions')
      .select('run_limit, status')
      .eq('workspace_id', membership.workspace_id)
      .eq('status', 'active')
      .maybeSingle(),
    supabase.from('usage_counters')
      .select('runs_count')
      .eq('workspace_id', membership.workspace_id)
      .eq('month_key', monthKey)
      .maybeSingle(),
  ]);

  const runLimit = sub?.run_limit ?? 30;
  const runsCount = counter?.runs_count ?? 0;

  if (runsCount >= runLimit) {
    await serviceSupabase
      .from('agent_runs')
      .update({
        status: 'failed',
        error_message: QUOTA_ERROR_MESSAGE,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', runId)
      .eq('workspace_id', membership.workspace_id)
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing']);

    return NextResponse.json({
      ok: false,
      error: QUOTA_ERROR_CODE,
      upgrade: true
    }, { status: 429 });
  }

  const { data: run } = await supabase
    .from('agent_runs')
    .select('id, workspace_id, user_id, agent_type_id, metadata, status, result_text, error_message, created_at, updated_at')
    .eq('id', runId)
    .eq('workspace_id', membership.workspace_id)
    .eq('user_id', user.id)
    .eq('agent_type_id', agentTypeId)
    .maybeSingle();

  if (!run) {
    return NextResponse.json({ ok: false, error: 'run_not_found' }, { status: 404 });
  }


  const runUpdatedAt = new Date(run.updated_at ?? run.created_at).getTime();
  const runAgeMs = Date.now() - runUpdatedAt;
  if ((run.status === 'pending' || run.status === 'processing') && runAgeMs > RUN_TIMEOUT_MS * 3) {
    await serviceSupabase
      .from('agent_runs')
      .update({
        status: 'failed',
        error_message: 'Çalıştırma zamanında tamamlanamadı. Lütfen yeniden deneyin.',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', runId)
      .eq('workspace_id', membership.workspace_id)
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing']);

    return NextResponse.json({ ok: false, error: 'run_timeout' }, { status: 409 });
  }

  if (run.status === 'completed' && run.result_text) {
    return NextResponse.json({ ok: true, runId, result: run.result_text, fromCache: true });
  }

  if (run.status === 'completed' && !run.result_text) {
    await serviceSupabase
      .from('agent_runs')
      .update({
        status: 'failed',
        error_message: 'Çalıştırma tamamlandı ancak sonuç metni boş döndü.',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', runId)
      .eq('workspace_id', membership.workspace_id)
      .eq('user_id', user.id);

    return NextResponse.json({ ok: false, error: 'empty_result' }, { status: 409 });
  }

  if (run.status === 'failed' && run.error_message) {
    const cachedErrorCode = isQuotaOrBillingFailure(run.error_message) ? QUOTA_ERROR_CODE : 'run_failed';
    return NextResponse.json({ ok: false, error: cachedErrorCode, message: toRunFailureMessage(cachedErrorCode) }, { status: 409 });
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
    const { error: markProcessingError } = await serviceSupabase
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

    if (markProcessingError) {
      throw new Error(`run_update_failed:${markProcessingError.message}`);
    }

    const shouldStream =
      requestMetadata &&
      typeof requestMetadata === 'object' &&
      'stream' in requestMetadata &&
      typeof requestMetadata.stream === 'boolean'
        ? requestMetadata.stream
        : agentType.slug === 'arastirma' || agentType.slug === 'rapor';
    const requestEditorState =
      requestMetadata && typeof requestMetadata === 'object' && 'editor_state' in requestMetadata
        ? (requestMetadata.editor_state as Record<string, unknown>)
        : null;
    const selectedAgentMode =
      requestEditorState && typeof requestEditorState.agent_mode === 'string' ? requestEditorState.agent_mode.trim().toLowerCase() : null;

    const aiRun = await Promise.race([
      shouldStream
        ? runTextStreamWithAiEngine({
            apiKey: openAiApiKey,
            agentSlug: agentType.slug,
            agentMode: selectedAgentMode,
            userInput,
            systemPrompt: agentType.system_prompt
          })
        : runTextWithAiEngine({
            apiKey: openAiApiKey,
            agentSlug: agentType.slug,
            agentMode: selectedAgentMode,
            userInput,
            systemPrompt: agentType.system_prompt
          }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('run_timeout')), RUN_TIMEOUT_MS);
      })
    ]);

    const resultText = aiRun.text;

    if (!resultText) {
      throw new Error('empty_result');
    }

    const normalizedMetadata = {
      ...(run.metadata ?? {}),
      ...(requestMetadata ?? {}),
      ai_engine: aiRun.displayLabel,
      agent_mode: selectedAgentMode
    };

    const { error: updateError } = await serviceSupabase
      .from('agent_runs')
      .update({
        result_text: resultText,
        status: 'completed',
        error_message: null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        model_name: aiRun.alias,
        tokens_input: aiRun.usage.inputTokens,
        tokens_output: aiRun.usage.outputTokens,
        metadata: normalizedMetadata
      })
      .eq('id', runId)
      .eq('user_id', user.id)
      .eq('workspace_id', membership.workspace_id);

    if (updateError) {
      throw new Error(`run_update_failed:${updateError.message}`);
    }

    await serviceSupabase.rpc('increment_usage_counter', {
      p_workspace_id: membership.workspace_id,
      p_month_key: monthKey,
    });

    const workflowFields = resolveWorkflowFieldsFromMetadata({ ...(run.metadata ?? {}), ...(requestMetadata ?? {}) });
    const resolvedProjectId = workflowFields.projectId ?? projectId;

    await upsertSavedOutputForRun(serviceSupabase, {
      workspaceId: membership.workspace_id,
      userId: user.id,
      runId,
      title: agentType.slug === 'sosyal' ? 'Sosyal medya çıktısı' : 'Agent çıktısı',
      content: resultText,
      projectId: resolvedProjectId,
      projectItemId: workflowFields.projectItemId,
      metadata: {
        ...(workflowFields.workflowMetadata ?? {}),
        source: 'agents_run_route'
      }
    });

    if (agentType.slug === 'sosyal') {
      const preferredPlatform =
        requestEditorState && typeof requestEditorState.platform === 'string' ? requestEditorState.platform.toLowerCase() : null;
      const requestedPlatforms =
        requestEditorState && typeof requestEditorState.platforms !== 'undefined' ? requestEditorState.platforms : null;
      const platforms: SocialPlatform[] = normalizePlatforms([...(preferredPlatform ? [preferredPlatform] : []), ...(Array.isArray(requestedPlatforms) ? requestedPlatforms : [])]);

      const draft = normalizeSocialContentDraft({
        sourceBrief: userInput,
        sourcePlatforms: platforms,
        rawText: resultText
      });

      const { data: existingSavedOutput } = await serviceSupabase
        .from('saved_outputs')
        .select('id')
        .eq('workspace_id', membership.workspace_id)
        .eq('user_id', user.id)
        .eq('agent_run_id', runId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let savedOutputId: string | null = null;
      if (existingSavedOutput?.id) {
        savedOutputId = existingSavedOutput.id;
        await serviceSupabase
          .from('saved_outputs')
          .update({
            project_id: resolvedProjectId,
            title: 'Sosyal medya çıktısı',
            content: resultText,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSavedOutput.id)
          .eq('workspace_id', membership.workspace_id)
          .eq('user_id', user.id);
      } else {
        const { data: savedOutput } = await serviceSupabase
          .from('saved_outputs')
          .insert({
            workspace_id: membership.workspace_id,
            user_id: user.id,
            project_id: resolvedProjectId,
            agent_run_id: runId,
            title: 'Sosyal medya çıktısı',
            content: resultText
          })
          .select('id')
          .maybeSingle();
        savedOutputId = savedOutput?.id ?? null;
      }

      const { data: existingContentItem } = await serviceSupabase
        .from('content_items')
        .select('id')
        .eq('workspace_id', membership.workspace_id)
        .eq('user_id', user.id)
        .eq('run_id', runId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let contentItemId: string | null = null;
      if (existingContentItem?.id) {
        contentItemId = existingContentItem.id;
        await serviceSupabase
          .from('content_items')
          .update({
            project_id: resolvedProjectId,
            saved_output_id: savedOutputId,
            brief: draft.brief,
            platforms: draft.platforms,
            youtube_title: draft.youtubeTitle,
            youtube_description: draft.youtubeDescription,
            instagram_caption: draft.instagramCaption,
            tiktok_caption: draft.tiktokCaption,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingContentItem.id)
          .eq('workspace_id', membership.workspace_id)
          .eq('user_id', user.id);
      } else {
        contentItemId = await insertContentItemWithFallbacks(serviceSupabase, {
          workspaceId: membership.workspace_id,
          userId: user.id,
          runId,
          projectId: resolvedProjectId,
          savedOutputId,
          draft
        });
      }

      if (contentItemId) {
        await insertPublishJobsWithFallbacks(serviceSupabase, {
          workspaceId: membership.workspace_id,
          projectId: resolvedProjectId,
          contentItemId,
          draft
        });
      }
    }

    return NextResponse.json({ ok: true, runId, result: resultText });
  } catch (error) {
    const errorCode = normalizeProviderError(error);
    const message = toRunFailureMessage(errorCode);
    const safeRuntimeMessage = toSafeRuntimeErrorMessage(error);
    const finalMessage = errorCode === 'run_failed' ? safeRuntimeMessage : message;

    if (errorCode === QUOTA_ERROR_CODE && MOCK_FALLBACK_FLAG) {
      const mockResult = [
        '[MOCK_AI_ON_FAILURE etkin]',
        'Bu içerik, AI sağlayıcısı kota/billing hatası verdiği için test amaçlı fallback olarak üretildi.',
        '',
        `Orijinal istem özeti: ${userInput.slice(0, 400)}`
      ].join('\n');

      await serviceSupabase
        .from('agent_runs')
        .update({
          result_text: mockResult,
          status: 'completed',
          error_message: null,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            ...(run.metadata ?? {}),
            ...(requestMetadata ?? {}),
            ai_engine: FALLBACK_ENGINE_NAME,
            fallback_mode: 'mock_ai_on_failure'
          }
        })
        .eq('id', runId)
        .eq('user_id', user.id)
        .eq('workspace_id', membership.workspace_id);

      return NextResponse.json({ ok: true, runId, result: mockResult, fallback: true });
    }

    await serviceSupabase
      .from('agent_runs')
      .update({
        status: 'failed',
        error_message: finalMessage,
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

    return NextResponse.json({
      ok: false,
      error: errorCode === QUOTA_ERROR_CODE ? QUOTA_ERROR_CODE : 'run_failed',
      message: finalMessage
    }, { status: 500 });
  }
}

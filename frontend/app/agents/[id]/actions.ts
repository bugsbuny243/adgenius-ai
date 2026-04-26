'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseActionServerClient } from '@/lib/supabase-server';
import { normalizeProjectItemType } from '@/lib/project-item-types';
import { UUID_PATTERN, toCanonicalAgentSlug } from '@/lib/agents';
import { getWorkspaceContext } from '@/lib/workspace';

const SUPPORTED_SOCIAL_PLATFORMS = ['youtube', 'instagram', 'tiktok'] as const;

function buildInternalUrl(pathname: string, headerList: Headers): string {
  const protocol = headerList.get('x-forwarded-proto') ?? 'http';
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? 'localhost:3000';
  return `${protocol}://${host}${pathname}`;
}

function parseRunMetadata(source: unknown): { editorState: Record<string, unknown>; freeNotes: string; derivedPrompt: string; workflowType: string; sourceProjectItemId: string; parentOutputId: string; targetItemType: string; revisionRound: string; knowledgeSourceIds: string[] } {
  if (!source || typeof source !== 'object') {
    return { editorState: {}, freeNotes: '', derivedPrompt: '', workflowType: '', sourceProjectItemId: '', parentOutputId: '', targetItemType: '', revisionRound: '', knowledgeSourceIds: [] };
  }

  const metadata = source as Record<string, unknown>;
  return {
    editorState: metadata.editor_state && typeof metadata.editor_state === 'object' ? (metadata.editor_state as Record<string, unknown>) : {},
    freeNotes: typeof metadata.free_notes === 'string' ? metadata.free_notes : '',
    derivedPrompt: typeof metadata.derived_prompt === 'string' ? metadata.derived_prompt : '',
    workflowType: typeof metadata.workflow_type === 'string' ? metadata.workflow_type : '',
    sourceProjectItemId: typeof metadata.source_project_item_id === 'string' ? metadata.source_project_item_id : '',
    parentOutputId: typeof metadata.parent_output_id === 'string' ? metadata.parent_output_id : '',
    targetItemType: typeof metadata.target_item_type === 'string' ? metadata.target_item_type : '',
    revisionRound:
      typeof metadata.revision_round === 'number'
        ? String(metadata.revision_round)
        : typeof metadata.revision_round === 'string'
          ? metadata.revision_round
          : '',
    knowledgeSourceIds: Array.isArray(metadata.knowledge_source_ids)
      ? metadata.knowledge_source_ids.filter((item): item is string => typeof item === 'string')
      : []
  };
}

function toUserFacingRunError(errorCode: string, fallbackMessage?: string): string {
  const fallback = typeof fallbackMessage === 'string' ? fallbackMessage.trim() : '';
  if (fallback) {
    return fallback.length > 240 ? `${fallback.slice(0, 240)}…` : fallback;
  }

  const normalized = errorCode.trim().toLowerCase();
  if (
    normalized === 'provider_quota_exceeded' ||
    normalized.includes('429') ||
    normalized.includes('too many requests') ||
    normalized.includes('resource_exhausted') ||
    normalized.includes('depleted credits') ||
    normalized.includes('billing')
  ) {
    return 'Kullanım limiti veya kredi durumu nedeniyle çalışma başlatılamadı.';
  }
  if (errorCode === 'workspace_not_found') return 'Çalışma alanı bulunamadı.';
  if (errorCode === 'agent_not_found') return 'Agent bulunamadı.';
  if (errorCode === 'invalid_payload') return 'Çalıştırma verisi doğrulanamadı.';
  if (errorCode === 'invalid_user' || errorCode === 'missing_token') return 'Oturum doğrulanamadı.';
  if (errorCode === 'run_not_found') return 'Çalıştırma kaydı bulunamadı.';
  if (errorCode === 'empty_result' || errorCode === 'parse_failure') return 'Çalışma tamamlanamadı. Lütfen girdiyi sadeleştirip tekrar deneyin.';
  if (errorCode === 'run_timeout') return 'Geçici servis yoğunluğu oluştu. Lütfen biraz sonra tekrar deneyin.';
  if (errorCode === 'missing_environment') return 'Sunucu yapılandırması eksik. Lütfen yöneticinizle iletişime geçin.';
  return 'Çalışma tamamlanamadı. Lütfen girdiyi sadeleştirip tekrar deneyin.';
}



async function resolveAgentType(serverSupabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, agentIdentifier: string) {
  const query = serverSupabase.from('agent_types').select('id, slug').eq('is_active', true);
  if (UUID_PATTERN.test(agentIdentifier)) {
    return query.eq('id', agentIdentifier).maybeSingle();
  }
  const canonical = toCanonicalAgentSlug(agentIdentifier) ?? agentIdentifier;
  return query.eq('slug', canonical).maybeSingle();
}
function isRedirectControlFlowError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const digest = 'digest' in error ? String((error as { digest?: unknown }).digest ?? '') : '';
  const message = 'message' in error ? String((error as { message?: unknown }).message ?? '') : '';
  return digest.includes('NEXT_REDIRECT') || message.includes('NEXT_REDIRECT');
}

export async function runAgentAction(agentId: string, formData: FormData) {
  const rawPrompt = String(formData.get('prompt') ?? '').trim();
  const derivedPrompt = String(formData.get('derived_prompt') ?? '').trim();
  const freeNotes = String(formData.get('free_notes') ?? '').trim();
  const editorStateRaw = String(formData.get('editor_state') ?? '').trim();
  const projectIdRaw = String(formData.get('project_id') ?? '').trim();
  const sourceProjectItemIdRaw = String(formData.get('source_project_item_id') ?? '').trim();
  const workflowTypeRaw = String(formData.get('workflow_type') ?? '').trim();
  const parentOutputIdRaw = String(formData.get('parent_output_id') ?? '').trim();
  const targetItemTypeRaw = String(formData.get('target_item_type') ?? '').trim();
  const revisionRoundRaw = String(formData.get('revision_round') ?? '').trim();
  const knowledgeSourceIdsRaw = String(formData.get('knowledge_source_ids') ?? '').trim();
  const projectId = projectIdRaw || null;
  const sourceProjectItemId = sourceProjectItemIdRaw || null;
  const workflowType = workflowTypeRaw || null;
  const parentOutputId = parentOutputIdRaw || null;
  const targetItemType = targetItemTypeRaw || null;
  const revisionRound = revisionRoundRaw ? Number(revisionRoundRaw) : null;
  const knowledgeSourceIds = knowledgeSourceIdsRaw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const prompt = derivedPrompt || rawPrompt;

  if (!prompt) {
    redirect(`/agents/${agentId}?error=İstem gerekli.`);
  }

  const serverSupabase = await createSupabaseActionServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) {
    redirect('/signin');
  }

  const {
    data: { session }
  } = await serverSupabase.auth.getSession();

  const accessToken = session?.access_token;
  if (!accessToken) {
    redirect(`/agents/${agentId}?error=Oturum doğrulanamadı.`);
  }

  const { workspaceId: currentWorkspaceId, userId: currentUserId } = await getWorkspaceContext();

  const [agentRes, projectRes] = await Promise.all([
    resolveAgentType(serverSupabase, agentId),
    projectId
      ? serverSupabase
          .from('projects')
          .select('id')
          .eq('id', projectId)
          .eq('workspace_id', currentWorkspaceId)
          .eq('user_id', currentUserId)
          .maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  const agent = agentRes.data;
  const project = projectRes.data;

  if (!agent) {
    redirect(`/agents/${agentId}?error=Agent bulunamadı.`);
  }

  if (projectId && !project) {
    redirect(`/agents/${agentId}?error=Seçilen proje doğrulanamadı.`);
  }

  let parsedEditorState: Record<string, unknown> = {};
  if (editorStateRaw) {
    try {
      const payload = JSON.parse(editorStateRaw) as Record<string, unknown>;
      if (payload && typeof payload === 'object') {
        parsedEditorState = payload;
      }
    } catch {
      parsedEditorState = {};
    }
  }

  const { data: run, error: runInsertError } = await serverSupabase
    .from('agent_runs')
    .insert({
      workspace_id: currentWorkspaceId,
      user_id: currentUserId,
      agent_type_id: agent.id,
      user_input: prompt,
      metadata: {
        project_id: projectId,
        source_project_item_id: sourceProjectItemId,
        workflow_type: workflowType,
        parent_output_id: parentOutputId,
        revision_round: Number.isFinite(revisionRound) ? revisionRound : null,
        target_item_type: targetItemType,
        editor_state: parsedEditorState,
        derived_prompt: derivedPrompt || prompt,
        free_notes: freeNotes,
        knowledge_source_ids: knowledgeSourceIds,
        input_mode: 'agent-live-editor-v2'
      },
      status: 'pending'
    })
    .select('id')
    .single();

  if (runInsertError || !run) {
    redirect(`/agents/${agentId}?error=Çalıştırma başlatılamadı.`);
  }

  try {
    const requestHeaders = await headers();
    const runResponse = await fetch(buildInternalUrl('/api/agents/run', requestHeaders), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        runId: run.id,
        agentTypeId: agent.id,
        userInput: prompt,
        projectId,
        metadata: {
          editor_state: parsedEditorState,
          derived_prompt: derivedPrompt || prompt,
          free_notes: freeNotes,
          knowledge_source_ids: knowledgeSourceIds,
          workflow_type: workflowType,
          source_project_item_id: sourceProjectItemId,
          parent_output_id: parentOutputId,
          revision_round: Number.isFinite(revisionRound) ? revisionRound : null,
          target_item_type: targetItemType
        }
      }),
      signal: AbortSignal.timeout(45_000)
    });

    if (!runResponse.ok) {
      const payload = (await runResponse.json().catch(() => null)) as { error?: string; message?: string } | null;
      const message = toUserFacingRunError(payload?.error ?? '', payload?.message);

      await serverSupabase
        .from('agent_runs')
        .update({
          status: 'failed',
          error_message: message,
          result_text: null,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', run.id)
        .eq('workspace_id', currentWorkspaceId)
        .eq('user_id', currentUserId)
        .in('status', ['pending', 'processing']);

      redirect(`/agents/${agentId}?error=${encodeURIComponent(message)}`);
    }
  } catch (error) {
    if (isRedirectControlFlowError(error)) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Çalıştırma başlatma hatası.';
    const safeMessage = toUserFacingRunError(message, message);
    const isTimeout = message.toLowerCase().includes('timeout') || message.toLowerCase().includes('aborted');

    const { data: latestRun } = await serverSupabase
      .from('agent_runs')
      .select('status')
      .eq('id', run.id)
      .eq('workspace_id', currentWorkspaceId)
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (latestRun?.status === 'processing' && isTimeout) {
      redirect(`/agents/${agentId}?run_id=${run.id}&error=${encodeURIComponent('Çalıştırma arka planda devam ediyor. Sonuç alanı otomatik güncellenecek.')}`);
    }

    await serverSupabase
      .from('agent_runs')
      .update({
        status: 'failed',
        error_message: safeMessage,
        result_text: null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: { source: 'agent_detail' }
      })
      .eq('id', run.id)
      .eq('workspace_id', currentWorkspaceId)
      .eq('user_id', currentUserId)
      .in('status', ['pending', 'processing']);

    redirect(`/agents/${agentId}?error=${encodeURIComponent(safeMessage)}`);
  }

  revalidatePath('/dashboard');
  revalidatePath(`/agents/${agentId}`);
  redirect(`/agents/${agentId}?run_id=${run.id}`);
}

export async function rerunAgentAction(agentId: string, formData: FormData) {
  const sourceRunId = String(formData.get('source_run_id') ?? '').trim();

  if (!sourceRunId) {
    redirect(`/agents/${agentId}?error=Yeniden çalıştırma için kaynak run seçilemedi.`);
  }

  const serverSupabase = await createSupabaseActionServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) {
    redirect('/signin');
  }

  const { workspaceId: currentWorkspaceId, userId: currentUserId } = await getWorkspaceContext();

  const { data: agent } = await resolveAgentType(serverSupabase, agentId);
  if (!agent) {
    redirect(`/agents/${agentId}?error=Agent bulunamadı.`);
  }

  const { data: sourceRun } = await serverSupabase
    .from('agent_runs')
    .select('id, user_input, metadata')
    .eq('id', sourceRunId)
    .eq('workspace_id', currentWorkspaceId)
    .eq('user_id', currentUserId)
    .eq('agent_type_id', agent.id)
    .maybeSingle();

  if (!sourceRun?.user_input) {
    redirect(`/agents/${agentId}?error=Kaynak run bulunamadı.`);
  }

  const parsed = parseRunMetadata(sourceRun.metadata);
  const runFormData = new FormData();
  runFormData.set('prompt', sourceRun.user_input);
  runFormData.set('derived_prompt', parsed.derivedPrompt || sourceRun.user_input);
  runFormData.set('free_notes', parsed.freeNotes);
  runFormData.set('editor_state', JSON.stringify(parsed.editorState));
  if (parsed.workflowType) runFormData.set('workflow_type', parsed.workflowType);
  if (parsed.sourceProjectItemId) runFormData.set('source_project_item_id', parsed.sourceProjectItemId);
  if (parsed.parentOutputId) runFormData.set('parent_output_id', parsed.parentOutputId);
  if (parsed.targetItemType) runFormData.set('target_item_type', parsed.targetItemType);
  if (parsed.revisionRound) runFormData.set('revision_round', parsed.revisionRound);
  if (parsed.knowledgeSourceIds.length) runFormData.set('knowledge_source_ids', parsed.knowledgeSourceIds.join(','));
  const sourceProjectId =
    sourceRun.metadata && typeof sourceRun.metadata === 'object' && 'project_id' in sourceRun.metadata && typeof sourceRun.metadata.project_id === 'string'
      ? sourceRun.metadata.project_id
      : '';
  if (sourceProjectId) {
    runFormData.set('project_id', sourceProjectId);
  }

  await runAgentAction(agentId, runFormData);
}

export async function saveOutputAction(agentId: string, formData: FormData) {
  const runId = String(formData.get('run_id') ?? '').trim();
  const title = String(formData.get('title') ?? 'Kaydedilen çıktı').trim() || 'Kaydedilen çıktı';

  if (!runId) {
    redirect(`/agents/${agentId}?error=Çalıştırma kimliği eksik.`);
  }

  const serverSupabase = await createSupabaseActionServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) {
    redirect('/signin');
  }

  const { workspaceId: currentWorkspaceId, userId: currentUserId } = await getWorkspaceContext();

  const { data: run } = await serverSupabase
    .from('agent_runs')
    .select('id, result_text')
    .eq('id', runId)
    .eq('workspace_id', currentWorkspaceId)
    .eq('user_id', currentUserId)
    .eq('status', 'completed')
    .maybeSingle();

  if (!run?.result_text) {
    redirect(`/agents/${agentId}?error=Kaydedilecek sonuç bulunamadı.`);
  }

  const { data: existingOutput } = await serverSupabase
    .from('saved_outputs')
    .select('id')
    .eq('workspace_id', currentWorkspaceId)
    .eq('user_id', currentUserId)
    .eq('agent_run_id', run.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingOutput?.id) {
    await serverSupabase
      .from('saved_outputs')
      .update({
        title,
        content: run.result_text,
        updated_at: new Date().toISOString(),
        metadata: { source: 'agent_detail' }
      })
      .eq('id', existingOutput.id)
      .eq('workspace_id', currentWorkspaceId)
      .eq('user_id', currentUserId);
  } else {
    await serverSupabase.from('saved_outputs').insert({
      workspace_id: currentWorkspaceId,
      user_id: currentUserId,
      agent_run_id: run.id,
      title,
      content: run.result_text,
      metadata: { source: 'agent_detail' }
    });
  }

  revalidatePath('/saved');
  redirect(`/agents/${agentId}?run_id=${runId}`);
}

export async function createProjectItemFromOutputAction(agentId: string, runIdParam: string, formData: FormData) {
  const outputId = String(formData.get('output_id') ?? '').trim();
  const projectId = String(formData.get('project_id') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const itemTypeRaw = String(formData.get('item_type') ?? '').trim();
  const requestedItemType = normalizeProjectItemType(itemTypeRaw || 'agent_output');
  const itemType = ['agent_output', 'scope', 'draft', 'delivery_note'].includes(requestedItemType) ? requestedItemType : 'agent_output';

  if (!outputId || !projectId || !title) {
    redirect(`/agents/${agentId}?error=Proje öğesi için tüm alanları doldurun.`);
  }

  const serverSupabase = await createSupabaseActionServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) {
    redirect('/signin');
  }

  const { workspaceId: currentWorkspaceId, userId: currentUserId } = await getWorkspaceContext();

  const { data: output } = await serverSupabase
    .from('saved_outputs')
    .select('id, content')
    .eq('id', outputId)
    .eq('workspace_id', currentWorkspaceId)
    .eq('user_id', currentUserId)
    .maybeSingle();

  if (!output) {
    redirect(`/agents/${agentId}?error=Kaydedilen çıktı bulunamadı.`);
  }

  const baseItem = {
    workspace_id: currentWorkspaceId,
    project_id: projectId,
    user_id: currentUserId,
    title,
    content: output.content,
    item_type: itemType
  };

  const { error: withSavedOutputError } = await serverSupabase.from('project_items').insert({
    ...baseItem,
    saved_output_id: output.id
  });

  if (withSavedOutputError) {
    redirect(`/agents/${agentId}?error=Çıktı projeye eklenemedi: ${withSavedOutputError.message}`);
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/agents/${agentId}?run_id=${runIdParam}`);
}

export async function attachSavedOutputToProjectAction(agentId: string, runIdParam: string, formData: FormData) {
  const runId = String(formData.get('run_id') ?? '').trim();
  const projectId = String(formData.get('project_id') ?? '').trim();
  const title = String(formData.get('title') ?? 'Agent Çıktısı').trim() || 'Agent Çıktısı';

  if (!runId || !projectId) {
    redirect(`/agents/${agentId}?error=Proje seçimi zorunludur.`);
  }

  const serverSupabase = await createSupabaseActionServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) {
    redirect('/signin');
  }

  const { workspaceId: currentWorkspaceId, userId: currentUserId } = await getWorkspaceContext();

  const [{ data: run }, { data: project }] = await Promise.all([
    serverSupabase
      .from('agent_runs')
      .select('id, result_text')
      .eq('id', runId)
      .eq('workspace_id', currentWorkspaceId)
      .eq('user_id', currentUserId)
      .eq('status', 'completed')
      .maybeSingle(),
    serverSupabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('workspace_id', currentWorkspaceId)
      .eq('user_id', currentUserId)
      .maybeSingle()
  ]);

  if (!run?.result_text || !project) {
    redirect(`/agents/${agentId}?error=Run veya proje doğrulanamadı.`);
  }

  await serverSupabase.from('saved_outputs').insert({
    workspace_id: currentWorkspaceId,
    user_id: currentUserId,
    agent_run_id: run.id,
    title,
    content: run.result_text,
    metadata: { source: 'agent_detail' }
  });

  revalidatePath('/saved');
  revalidatePath(`/projects/${projectId}`);
  redirect(`/agents/${agentId}?run_id=${runIdParam}`);
}

export async function queueSocialPublishAction(agentId: string, runIdParam: string, formData: FormData) {
  const runId = String(formData.get('run_id') ?? '').trim();
  const contentItemId = String(formData.get('content_item_id') ?? '').trim();
  const selectedPlatform = String(formData.get('target_platform') ?? '')
    .trim()
    .toLowerCase();

  if (!runId || !contentItemId || !SUPPORTED_SOCIAL_PLATFORMS.includes(selectedPlatform as (typeof SUPPORTED_SOCIAL_PLATFORMS)[number])) {
    redirect(`/agents/${agentId}?run_id=${runIdParam}&error=Yayın kuyruğu için geçerli platform seçin.`);
  }

  const serverSupabase = await createSupabaseActionServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) {
    redirect('/signin');
  }

  const { workspaceId, userId } = await getWorkspaceContext();

  const { data: contentItem } = await serverSupabase
    .from('content_items')
    .select(
      'id, workspace_id, project_id, brief, youtube_title, youtube_description, instagram_caption, tiktok_caption, platforms'
    )
    .eq('id', contentItemId)
    .eq('run_id', runId)
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!contentItem) {
    redirect(`/agents/${agentId}?run_id=${runIdParam}&error=Yayın için içerik kaydı bulunamadı.`);
  }

  const payload: Record<string, unknown> = {
    brief: contentItem.brief ?? '',
    platform: selectedPlatform,
    source: 'agent_detail',
    run_id: runId,
    content_item_id: contentItem.id,
    project_id: contentItem.project_id ?? null
  };

  if (selectedPlatform === 'youtube') {
    payload.youtube_title = contentItem.youtube_title ?? null;
    payload.youtube_description = contentItem.youtube_description ?? null;
  }
  if (selectedPlatform === 'instagram') {
    payload.instagram_caption = contentItem.instagram_caption ?? null;
  }
  if (selectedPlatform === 'tiktok') {
    payload.tiktok_caption = contentItem.tiktok_caption ?? null;
  }
  const { error: queueError } = await serverSupabase.from('publish_jobs').insert({
    workspace_id: workspaceId,
    project_id: contentItem.project_id,
    content_output_id: contentItem.id,
    payload,
    queued_at: new Date().toISOString(),
    status: 'queued',
    target_platform: selectedPlatform
  });

  if (queueError) {
    redirect(`/agents/${agentId}?run_id=${runIdParam}&error=Yayın kuyruğuna eklenemedi: ${queueError.message}`);
  }

  revalidatePath('/composer');
  revalidatePath(`/agents/${agentId}`);
  redirect(`/agents/${agentId}?run_id=${runIdParam}`);
}

'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';

function buildInternalUrl(pathname: string, headerList: Headers): string {
  const protocol = headerList.get('x-forwarded-proto') ?? 'http';
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? 'localhost:3000';
  return `${protocol}://${host}${pathname}`;
}

function parseRunMetadata(source: unknown): { editorState: Record<string, unknown>; freeNotes: string; derivedPrompt: string } {
  if (!source || typeof source !== 'object') {
    return { editorState: {}, freeNotes: '', derivedPrompt: '' };
  }

  const metadata = source as Record<string, unknown>;
  return {
    editorState: metadata.editor_state && typeof metadata.editor_state === 'object' ? (metadata.editor_state as Record<string, unknown>) : {},
    freeNotes: typeof metadata.free_notes === 'string' ? metadata.free_notes : '',
    derivedPrompt: typeof metadata.derived_prompt === 'string' ? metadata.derived_prompt : ''
  };
}

export async function runAgentAction(agentId: string, formData: FormData) {
  const rawPrompt = String(formData.get('prompt') ?? '').trim();
  const derivedPrompt = String(formData.get('derived_prompt') ?? '').trim();
  const freeNotes = String(formData.get('free_notes') ?? '').trim();
  const editorStateRaw = String(formData.get('editor_state') ?? '').trim();
  const projectIdRaw = String(formData.get('project_id') ?? '').trim();
  const projectId = projectIdRaw || null;

  const prompt = derivedPrompt || rawPrompt;

  if (!prompt) {
    redirect(`/agents/${agentId}?error=İstem gerekli.`);
  }

  const serverSupabase = await createSupabaseServerClient();
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
    serverSupabase.from('agent_types').select('id').eq('id', agentId).eq('is_active', true).maybeSingle(),
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
      agent_type_id: agentId,
      user_input: prompt,
      metadata: {
        project_id: projectId,
        editor_state: parsedEditorState,
        derived_prompt: derivedPrompt || prompt,
        free_notes: freeNotes,
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
        agentTypeId: agentId,
        userInput: prompt,
        projectId,
        metadata: {
          editor_state: parsedEditorState,
          derived_prompt: derivedPrompt || prompt,
          free_notes: freeNotes
        }
      }),
      signal: AbortSignal.timeout(45_000)
    });

    if (!runResponse.ok) {
      const payload = (await runResponse.json().catch(() => null)) as { error?: string } | null;
      const message = payload?.error ?? 'Çalıştırma sırasında hata oluştu.';

      await serverSupabase
        .from('agent_runs')
        .update({
          status: 'failed',
          error_message: message,
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
    const message = error instanceof Error ? error.message : 'Çalıştırma başlatma hatası.';
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
        error_message: message,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', run.id)
      .eq('workspace_id', currentWorkspaceId)
      .eq('user_id', currentUserId)
      .in('status', ['pending', 'processing']);

    redirect(`/agents/${agentId}?error=${encodeURIComponent(message)}`);
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

  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) {
    redirect('/signin');
  }

  const { workspaceId: currentWorkspaceId, userId: currentUserId } = await getWorkspaceContext();

  const { data: sourceRun } = await serverSupabase
    .from('agent_runs')
    .select('id, user_input, metadata, project_id')
    .eq('id', sourceRunId)
    .eq('workspace_id', currentWorkspaceId)
    .eq('user_id', currentUserId)
    .eq('agent_type_id', agentId)
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
  if (sourceRun.project_id) {
    runFormData.set('project_id', sourceRun.project_id);
  }

  await runAgentAction(agentId, runFormData);
}

export async function saveOutputAction(agentId: string, formData: FormData) {
  const runId = String(formData.get('run_id') ?? '').trim();
  const title = String(formData.get('title') ?? 'Kaydedilen çıktı').trim() || 'Kaydedilen çıktı';

  if (!runId) {
    redirect(`/agents/${agentId}?error=Çalıştırma kimliği eksik.`);
  }

  const serverSupabase = await createSupabaseServerClient();
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
        updated_at: new Date().toISOString()
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
      content: run.result_text
    });
  }

  revalidatePath('/saved');
  redirect(`/agents/${agentId}?run_id=${runId}`);
}

export async function createProjectItemFromOutputAction(agentId: string, runIdParam: string, formData: FormData) {
  const outputId = String(formData.get('output_id') ?? '').trim();
  const projectId = String(formData.get('project_id') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();

  if (!outputId || !projectId || !title) {
    redirect(`/agents/${agentId}?error=Proje öğesi için tüm alanları doldurun.`);
  }

  const serverSupabase = await createSupabaseServerClient();
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
    item_type: 'agent_output'
  };

  const { error: withSavedOutputError } = await serverSupabase.from('project_items').insert({
    ...baseItem,
    saved_output_id: output.id
  });

  if (withSavedOutputError) {
    await serverSupabase.from('project_items').insert({
      ...baseItem,
      source_output_id: output.id
    });
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

  const serverSupabase = await createSupabaseServerClient();
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
    content: run.result_text
  });

  revalidatePath('/saved');
  revalidatePath(`/projects/${projectId}`);
  redirect(`/agents/${agentId}?run_id=${runIdParam}`);
}

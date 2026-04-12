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

export async function runAgentAction(agentId: string, formData: FormData) {
  const prompt = String(formData.get('prompt') ?? '').trim();

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

  const { data: agent } = await serverSupabase
    .from('agent_types')
    .select('id')
    .eq('id', agentId)
    .eq('is_active', true)
    .maybeSingle();

  if (!agent) {
    redirect(`/agents/${agentId}?error=Agent bulunamadı.`);
  }

  const { data: run, error: runInsertError } = await serverSupabase
    .from('agent_runs')
    .insert({
      workspace_id: currentWorkspaceId,
      user_id: currentUserId,
      agent_type_id: agentId,
      user_input: prompt,
      status: 'pending'
    })
    .select('id')
    .single();

  if (runInsertError || !run) {
    redirect(`/agents/${agentId}?error=Çalıştırma başlatılamadı.`);
  }

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
      userInput: prompt
    })
  });

  if (!runResponse.ok) {
    const payload = (await runResponse.json().catch(() => null)) as { error?: string } | null;
    const message = payload?.error ?? 'Çalıştırma sırasında hata oluştu.';
    redirect(`/agents/${agentId}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/dashboard');
  revalidatePath(`/agents/${agentId}`);
  redirect(`/agents/${agentId}?run_id=${run.id}`);
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

  await serverSupabase.from('saved_outputs').insert({
    workspace_id: currentWorkspaceId,
    user_id: currentUserId,
    agent_run_id: run.id,
    title,
    content: run.result_text
  });

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

  await serverSupabase.from('project_items').insert({
    workspace_id: currentWorkspaceId,
    project_id: projectId,
    user_id: currentUserId,
    saved_output_id: output.id,
    title,
    content: output.content,
    item_type: 'agent_output'
  });

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

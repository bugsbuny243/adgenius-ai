'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createKnowledgeSource } from '@/lib/knowledge';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';

export async function createProjectItemAction(projectId: string, formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const details = String(formData.get('details') ?? '').trim();

  if (!title) return;

  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) redirect('/login');

  const { workspaceId: currentWorkspaceId } = await getWorkspaceContext();

  await serverSupabase.from('project_items').insert({
    workspace_id: currentWorkspaceId,
    project_id: projectId,
    user_id: currentUser.id,
    item_type: 'note',
    title,
    status: 'open',
    payload: details ? { details } : null
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function addKnowledgeSourceAction(projectId: string, formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const sourceType = String(formData.get('source_type') ?? 'text').trim() as 'file' | 'text' | 'url' | 'brief';
  const rawText = String(formData.get('raw_text') ?? '').trim();
  const sourceUrl = String(formData.get('source_url') ?? '').trim();

  if (!title || (!rawText && !sourceUrl)) return;

  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) redirect('/login');

  const { workspaceId: currentWorkspaceId } = await getWorkspaceContext();

  await createKnowledgeSource({
    supabase: serverSupabase,
    workspaceId: currentWorkspaceId,
    projectId,
    userId: currentUser.id,
    sourceType,
    title,
    rawText: rawText || null,
    sourceUrl: sourceUrl || null,
    metadata: { source: 'project-page-form' }
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function addProjectKnowledgeAction(projectId: string, formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const entryType = String(formData.get('entry_type') ?? 'note').trim();
  const sourceIdRaw = String(formData.get('source_id') ?? '').trim();

  if (!title || !content) return;

  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) redirect('/login');

  const { workspaceId: currentWorkspaceId } = await getWorkspaceContext();

  await serverSupabase.from('project_knowledge_entries').insert({
    workspace_id: currentWorkspaceId,
    project_id: projectId,
    source_id: sourceIdRaw || null,
    entry_type: entryType || 'note',
    title,
    content,
    metadata: {},
    created_by: currentUser.id
  });

  revalidatePath(`/projects/${projectId}`);
}

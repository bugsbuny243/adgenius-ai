'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { normalizeProjectItemType } from '@/lib/project-item-types';
import { normalizeProjectStatus } from '@/lib/project-status';
import { getWorkspaceContext } from '@/lib/workspace';

async function createWorkflowItem(projectId: string, payload: { itemType: string; title: string; content?: string; parentItemId?: string | null }) {
  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) redirect('/signin');

  const { workspaceId: currentWorkspaceId } = await getWorkspaceContext();

  await serverSupabase.from('project_items').insert({
    workspace_id: currentWorkspaceId,
    project_id: projectId,
    user_id: currentUser.id,
    item_type: normalizeProjectItemType(payload.itemType),
    title: payload.title,
    content: payload.content || null,
    parent_item_id: payload.parentItemId ?? null,
    metadata: {}
  });

  await serverSupabase
    .from('projects')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('workspace_id', currentWorkspaceId)
    .eq('user_id', currentUser.id);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/projects');
  revalidatePath('/dashboard');
}

export async function createProjectItemAction(projectId: string, formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const details = String(formData.get('details') ?? '').trim();

  if (!title) return;

  await createWorkflowItem(projectId, {
    itemType: 'agent_output',
    title,
    content: details
  });
}

export async function createBriefItemAction(projectId: string, formData: FormData) {
  const title = String(formData.get('title') ?? 'Brief').trim() || 'Brief';
  const content = String(formData.get('content') ?? '').trim();
  if (!content) return;
  await createWorkflowItem(projectId, { itemType: 'brief', title, content });
}

export async function createScopeItemAction(projectId: string, formData: FormData) {
  const title = String(formData.get('title') ?? 'Scope').trim() || 'Scope';
  const content = String(formData.get('content') ?? '').trim();
  if (!content) return;
  await createWorkflowItem(projectId, { itemType: 'scope', title, content });
}

export async function createTaskPlanItemAction(projectId: string, formData: FormData) {
  const title = String(formData.get('title') ?? 'Task Plan').trim() || 'Task Plan';
  const content = String(formData.get('content') ?? '').trim();
  if (!content) return;
  await createWorkflowItem(projectId, { itemType: 'task_plan', title, content });
}

export async function createRevisionNoteAction(projectId: string, formData: FormData) {
  const title = String(formData.get('title') ?? 'Revision Note').trim() || 'Revision Note';
  const content = String(formData.get('content') ?? '').trim();
  if (!content) return;
  await createWorkflowItem(projectId, { itemType: 'revision_note', title, content });
}

export async function createDeliveryNoteAction(projectId: string, formData: FormData) {
  const title = String(formData.get('title') ?? 'Delivery Note').trim() || 'Delivery Note';
  const content = String(formData.get('content') ?? '').trim();
  if (!content) return;
  await createWorkflowItem(projectId, { itemType: 'delivery_note', title, content });
}

export async function updateProjectStatusAction(projectId: string, formData: FormData) {
  const nextStatus = normalizeProjectStatus(formData.get('status'));

  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) redirect('/signin');

  const { workspaceId: currentWorkspaceId } = await getWorkspaceContext();

  await serverSupabase
    .from('projects')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', projectId)
    .eq('workspace_id', currentWorkspaceId)
    .eq('user_id', currentUser.id);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/projects');
  revalidatePath('/dashboard');
}

export async function attachSavedOutputToProjectItemAction(projectId: string, formData: FormData) {
  const savedOutputId = String(formData.get('saved_output_id') ?? '').trim();
  const projectItemId = String(formData.get('project_item_id') ?? '').trim();

  if (!savedOutputId || !projectItemId) return;

  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) redirect('/signin');

  const { workspaceId: currentWorkspaceId } = await getWorkspaceContext();

  const [savedOutputRes, projectItemRes] = await Promise.all([
    serverSupabase
      .from('saved_outputs')
      .select('id, metadata')
      .eq('id', savedOutputId)
      .eq('workspace_id', currentWorkspaceId)
      .eq('user_id', currentUser.id)
      .maybeSingle(),
    serverSupabase
      .from('project_items')
      .select('id, saved_output_id')
      .eq('id', projectItemId)
      .eq('project_id', projectId)
      .eq('workspace_id', currentWorkspaceId)
      .eq('user_id', currentUser.id)
      .maybeSingle()
  ]);

  if (!savedOutputRes.data || !projectItemRes.data) return;

  const existingMetadata =
    savedOutputRes.data.metadata && typeof savedOutputRes.data.metadata === 'object' && !Array.isArray(savedOutputRes.data.metadata)
      ? (savedOutputRes.data.metadata as Record<string, unknown>)
      : {};

  await serverSupabase
    .from('saved_outputs')
    .update({
      project_id: projectId,
      project_item_id: projectItemId,
      metadata: {
        ...existingMetadata,
        source: 'project_detail_attach',
        attached_at: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', savedOutputId)
    .eq('workspace_id', currentWorkspaceId)
    .eq('user_id', currentUser.id);

  if (!projectItemRes.data.saved_output_id || projectItemRes.data.saved_output_id !== savedOutputId) {
    await serverSupabase
      .from('project_items')
      .update({
        saved_output_id: savedOutputId,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectItemId)
      .eq('project_id', projectId)
      .eq('workspace_id', currentWorkspaceId)
      .eq('user_id', currentUser.id);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/saved');
}

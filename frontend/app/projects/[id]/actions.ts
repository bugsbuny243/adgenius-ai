'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
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

  if (!currentUser) redirect('/signin');

  const { workspaceId: currentWorkspaceId } = await getWorkspaceContext();

  await serverSupabase.from('project_items').insert({
    workspace_id: currentWorkspaceId,
    project_id: projectId,
    user_id: currentUser.id,
    item_type: 'note',
    title,
    content: details || null
  });

  revalidatePath(`/projects/${projectId}`);
}

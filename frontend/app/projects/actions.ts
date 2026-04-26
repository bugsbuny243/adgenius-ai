'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseActionServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';

export async function createProjectAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();

  if (!name) return;

  const serverSupabase = await createSupabaseActionServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) {
    redirect('/signin');
  }

  const { workspaceId: currentWorkspaceId } = await getWorkspaceContext();

  await serverSupabase.from('projects').insert({
    workspace_id: currentWorkspaceId,
    user_id: currentUser.id,
    name,
    description: description || null
  });

  revalidatePath('/projects');
  revalidatePath('/dashboard');
}

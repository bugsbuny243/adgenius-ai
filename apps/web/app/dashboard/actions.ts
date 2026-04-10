'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';

export async function addWorkspaceMemoryAction(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const entryType = String(formData.get('entry_type') ?? 'note').trim() || 'note';

  if (!title || !content) return;

  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) redirect('/login');

  const { workspaceId: currentWorkspaceId } = await getWorkspaceContext();

  await serverSupabase.from('workspace_memory_entries').insert({
    workspace_id: currentWorkspaceId,
    entry_type: entryType,
    title,
    content,
    priority: 0,
    is_active: true,
    created_by: currentUser.id
  });

  revalidatePath('/dashboard');
}

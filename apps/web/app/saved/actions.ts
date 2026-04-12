'use server';

import { revalidatePath } from 'next/cache';
import { getAppContextOrRedirect } from '@/lib/app-context';

export async function deleteSavedOutputAction(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const { supabase, workspace } = await getAppContextOrRedirect();
  await supabase.from('saved_outputs').delete().eq('id', id).eq('workspace_id', workspace.workspaceId);
  revalidatePath('/saved');
}

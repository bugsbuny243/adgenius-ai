'use server';

import { revalidatePath } from 'next/cache';
import { requirePlatformOwner } from '@/lib/owner-auth';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

export async function setUserPremiumAction(formData: FormData) {
  await requirePlatformOwner();
  const workspaceId = String(formData.get('workspaceId') ?? '').trim();
  const nextState = String(formData.get('nextState') ?? '').trim();
  if (!workspaceId || !['grant', 'revoke'].includes(nextState)) return;

  const supabase = getSupabaseServiceRoleClient();
  if (nextState === 'grant') {
    await supabase.from('subscriptions').upsert({
      workspace_id: workspaceId,
      plan_name: 'premium',
      status: 'active',
      run_limit: 9999
    }, { onConflict: 'workspace_id' });
  } else {
    await supabase.from('subscriptions').upsert({
      workspace_id: workspaceId,
      plan_name: 'free',
      status: 'inactive',
      run_limit: 10
    }, { onConflict: 'workspace_id' });
  }

  revalidatePath('/owner/users');
  revalidatePath('/owner/dashboard');
}

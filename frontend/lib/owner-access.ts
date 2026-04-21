import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';

export const OWNER_ROLES = ['owner', 'admin'] as const;

export type OwnerAccessContext = {
  userId: string;
  workspaceId: string;
  workspaceName: string;
  role: (typeof OWNER_ROLES)[number];
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
};

export async function getOwnerAccessContextOrRedirect(): Promise<OwnerAccessContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin');
  }

  const workspace = await getWorkspaceContext();

  const { data: membership, error } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace.workspaceId)
    .eq('user_id', user.id)
    .maybeSingle();

  const role = membership?.role;

  if (error || !role || !OWNER_ROLES.includes(role as (typeof OWNER_ROLES)[number])) {
    redirect('/dashboard');
  }

  return {
    userId: user.id,
    workspaceId: workspace.workspaceId,
    workspaceName: workspace.workspaceName,
    role: role as (typeof OWNER_ROLES)[number],
    supabase
  };
}

export async function assertOwnerAccessOrThrow() {
  const context = await getOwnerAccessContextOrRedirect();
  return context;
}

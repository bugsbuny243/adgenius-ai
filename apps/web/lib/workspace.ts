import { createSupabaseServerClient } from '@/lib/supabase-server';

export type WorkspaceContext = {
  userId: string;
  workspaceId: string;
  workspaceName: string;
};

export async function getWorkspaceContext(): Promise<WorkspaceContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User is not authenticated.');
  }

  const { data: memberships, error } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    throw new Error(`Unable to load workspace membership: ${error.message}`);
  }

  const membership = memberships?.[0];

  if (!membership?.workspace_id) {
    throw new Error('No workspace membership found for current user.');
  }

  const workspaceName =
    (Array.isArray(membership.workspaces) ? membership.workspaces[0]?.name : membership.workspaces?.name) ??
    'Workspace';

  return {
    userId: user.id,
    workspaceId: membership.workspace_id,
    workspaceName
  };
}

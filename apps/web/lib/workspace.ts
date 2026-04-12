import { createSupabaseServerClient } from '@/lib/supabase-server';

export type WorkspaceContext = {
  userId: string;
  workspaceId: string;
  workspaceName: string;
};

type WorkspaceMembershipRow = {
  workspace_id: string;
  workspaces: { name: string } | { name: string }[] | null;
};

export async function getWorkspaceContext(): Promise<WorkspaceContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Çalışma alanı bulunamadı.');
  }

  const { data: membership, error } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !membership?.workspace_id) {
    throw new Error('Çalışma alanı bulunamadı.');
  }

  const typedMembership = membership as WorkspaceMembershipRow;
  const workspaceRelation = typedMembership.workspaces;
  const workspaceName = Array.isArray(workspaceRelation) ? workspaceRelation[0]?.name : workspaceRelation?.name;

  if (!workspaceName) {
    throw new Error('Çalışma alanı bulunamadı.');
  }

  return {
    userId: user.id,
    workspaceId: typedMembership.workspace_id,
    workspaceName
  };
}

export async function getWorkspaceContextOrNull(): Promise<WorkspaceContext | null> {
  try {
    return await getWorkspaceContext();
  } catch {
    return null;
  }
}

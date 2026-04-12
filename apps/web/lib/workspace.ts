import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getOptionalEnv } from '@/lib/env';
import { createClient } from '@supabase/supabase-js';

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

  const workspaces = membership.workspaces as { name?: string } | Array<{ name?: string }> | null;
  const workspaceName =
    (Array.isArray(workspaces) ? workspaces[0]?.name : workspaces?.name) ?? 'Workspace';

  return {
    userId: user.id,
    workspaceId: membership.workspace_id,
    workspaceName
  };
}

function slugifyWorkspaceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export async function getWorkspaceContextOrNull(): Promise<WorkspaceContext | null> {
  try {
    return await getWorkspaceContext();
  } catch (error) {
    console.error('[workspace] failed to load workspace context', { error });
    return null;
  }
}

export async function bootstrapWorkspaceForUser(userId: string, email?: string | null): Promise<WorkspaceContext | null> {
  const url = getOptionalEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = getOptionalEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceRoleKey) {
    return null;
  }

  const service = createClient(url, serviceRoleKey);
  const { data: existingMembership } = await service
    .from('workspace_members')
    .select('workspace_id, workspaces(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingMembership?.workspace_id) {
    const workspaces = existingMembership.workspaces as { name?: string } | Array<{ name?: string }> | null;
    const workspaceName = (Array.isArray(workspaces) ? workspaces[0]?.name : workspaces?.name) ?? 'Workspace';

    return {
      userId,
      workspaceId: existingMembership.workspace_id,
      workspaceName
    };
  }

  const emailName = email?.split('@')[0] ?? 'User';
  const workspaceName = `${emailName} Workspace`;
  const slugBase = slugifyWorkspaceName(workspaceName) || 'workspace';
  const workspaceSlug = `${slugBase}-${userId.slice(0, 8)}`;

  const { data: workspace, error: workspaceError } = await service
    .from('workspaces')
    .insert({
      name: workspaceName,
      slug: workspaceSlug,
      owner_user_id: userId
    })
    .select('id, name')
    .single();

  if (workspaceError || !workspace) {
    console.error('[workspace] bootstrap insert failed', { workspaceError, userId });
    return null;
  }

  await service.from('workspace_members').upsert(
    {
      workspace_id: workspace.id,
      user_id: userId,
      role: 'owner'
    },
    { onConflict: 'workspace_id,user_id' }
  );

  return {
    userId,
    workspaceId: workspace.id,
    workspaceName: workspace.name
  };
}

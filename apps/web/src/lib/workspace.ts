import type { SupabaseClient, User } from '@supabase/supabase-js';

export class WorkspaceError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
};

type Workspace = {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
};

type WorkspaceMember = {
  workspace_id: string;
  role: 'owner' | 'admin' | 'member';
  workspaces: Workspace | Workspace[];
};

export type WorkspaceContext = {
  user: User;
  workspace: Workspace;
  profile: Profile | null;
  memberRole: 'owner' | 'admin' | 'member';
};

export async function loadCurrentUser(supabase: SupabaseClient): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new WorkspaceError(`Oturum doğrulanamadı: ${error.message}`, 'AUTH_ERROR');
  }

  return user;
}

function normalizeWorkspace(relation: Workspace | Workspace[] | null | undefined): Workspace | null {
  if (!relation) {
    return null;
  }

  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

export async function resolveCurrentWorkspaceMembership(
  supabase: SupabaseClient,
  user: User,
): Promise<{ workspace: Workspace; role: 'owner' | 'admin' | 'member' }> {
  const { data: pref } = await supabase
    .from('user_workspace_preferences')
    .select('current_workspace_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const preferredWorkspaceId = pref?.current_workspace_id ?? null;

  let query = supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces!inner(id, owner_id, name, created_at)')
    .eq('user_id', user.id)
    .limit(1);

  if (preferredWorkspaceId) {
    query = query.eq('workspace_id', preferredWorkspaceId);
  }

  const { data: preferredMembership, error: preferredError } = await query.maybeSingle();

  if (preferredError) {
    throw new WorkspaceError(`Çalışma alanı üyeliği okunamadı: ${preferredError.message}`, 'WORKSPACE_QUERY_ERROR');
  }

  const preferredWorkspace = normalizeWorkspace((preferredMembership as WorkspaceMember | null)?.workspaces);

  if (preferredMembership && preferredWorkspace) {
    return {
      workspace: preferredWorkspace,
      role: preferredMembership.role,
    };
  }

  const { data: fallbackMembership, error: fallbackError } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces!inner(id, owner_id, name, created_at)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fallbackError) {
    throw new WorkspaceError(`Çalışma alanı bilgisi okunamadı: ${fallbackError.message}`, 'WORKSPACE_QUERY_ERROR');
  }

  const fallbackWorkspace = normalizeWorkspace((fallbackMembership as WorkspaceMember | null)?.workspaces);

  if (!fallbackMembership || !fallbackWorkspace) {
    throw new WorkspaceError('Çalışma alanı bulunamadı.', 'WORKSPACE_NOT_FOUND');
  }

  if (preferredWorkspaceId !== fallbackMembership.workspace_id) {
    await supabase.from('user_workspace_preferences').upsert({
      user_id: user.id,
      current_workspace_id: fallbackMembership.workspace_id,
    });
  }

  return {
    workspace: fallbackWorkspace,
    role: fallbackMembership.role,
  };
}

export async function resolveWorkspaceContext(supabase: SupabaseClient): Promise<WorkspaceContext> {
  const user = await loadCurrentUser(supabase);

  if (!user) {
    throw new WorkspaceError('Oturum bulunamadı.', 'UNAUTHENTICATED');
  }

  const { workspace, role } = await resolveCurrentWorkspaceMembership(supabase, user);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw new WorkspaceError(`Profil bilgisi alınamadı: ${profileError.message}`, 'PROFILE_QUERY_ERROR');
  }

  return {
    user,
    workspace,
    profile: profile as Profile | null,
    memberRole: role,
  };
}

export async function bootstrapWorkspaceForUser(supabase: SupabaseClient, user: User): Promise<Workspace> {
  const membership = await resolveCurrentWorkspaceMembership(supabase, user);
  return membership.workspace;
}

export async function getCurrentWorkspace(supabase: SupabaseClient, user: User): Promise<Workspace> {
  return bootstrapWorkspaceForUser(supabase, user);
}

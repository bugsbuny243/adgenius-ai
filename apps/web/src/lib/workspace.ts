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

export type WorkspaceContext = {
  user: User;
  workspace: Workspace;
  profile: Profile | null;
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

export async function resolveWorkspaceContext(supabase: SupabaseClient): Promise<WorkspaceContext> {
  const user = await loadCurrentUser(supabase);

  if (!user) {
    throw new WorkspaceError('Oturum bulunamadı.', 'UNAUTHENTICATED');
  }

  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces!inner(id, owner_id, name, created_at)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new WorkspaceError(`Çalışma alanı üyeliği okunamadı: ${membershipError.message}`, 'WORKSPACE_QUERY_ERROR');
  }

  const workspace = Array.isArray(membership?.workspaces) ? membership.workspaces[0] : membership?.workspaces;

  if (!workspace) {
    throw new WorkspaceError('Çalışma alanı bulunamadı.', 'WORKSPACE_NOT_FOUND');
  }

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
    workspace: workspace as Workspace,
    profile: profile as Profile | null,
  };
}


export async function bootstrapWorkspaceForUser(supabase: SupabaseClient, user: User): Promise<Workspace> {
  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces!inner(id, owner_id, name, created_at)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new WorkspaceError(`Çalışma alanı üyeliği okunamadı: ${membershipError.message}`, 'WORKSPACE_QUERY_ERROR');
  }

  const workspace = Array.isArray(membership?.workspaces) ? membership.workspaces[0] : membership?.workspaces;

  if (!workspace) {
    throw new WorkspaceError('Çalışma alanı bulunamadı.', 'WORKSPACE_NOT_FOUND');
  }

  return workspace as Workspace;
}

export async function getCurrentWorkspace(supabase: SupabaseClient, user: User): Promise<Workspace> {
  return bootstrapWorkspaceForUser(supabase, user);
}

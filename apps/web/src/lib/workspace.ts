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

type MembershipRow = {
  workspace_id: string;
  role: 'owner' | 'admin' | 'member';
  workspaces: Workspace | Workspace[];
};

export type WorkspaceContext = {
  user: User;
  workspace: Workspace;
  profile: Profile | null;
  role: 'owner' | 'admin' | 'member';
};

function pickWorkspace(workspaces: Workspace | Workspace[] | null | undefined): Workspace | null {
  if (!workspaces) {
    return null;
  }

  return Array.isArray(workspaces) ? (workspaces[0] ?? null) : workspaces;
}

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

async function resolveCurrentMembership(supabase: SupabaseClient, userId: string): Promise<MembershipRow | null> {
  const { data: memberships, error } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces!inner(id, owner_id, name, created_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new WorkspaceError(`Çalışma alanı üyeliği okunamadı: ${error.message}`, 'WORKSPACE_QUERY_ERROR');
  }

  return ((memberships ?? [])[0] as MembershipRow | undefined) ?? null;
}

export async function resolveWorkspaceContext(supabase: SupabaseClient): Promise<WorkspaceContext> {
  const user = await loadCurrentUser(supabase);

  if (!user) {
    throw new WorkspaceError('Oturum bulunamadı.', 'UNAUTHENTICATED');
  }

  const membership = await resolveCurrentMembership(supabase, user.id);
  const workspace = pickWorkspace(membership?.workspaces);

  if (!membership?.workspace_id || !workspace) {
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
    workspace,
    profile: profile as Profile | null,
    role: membership.role,
  };
}

export async function bootstrapWorkspaceForUser(supabase: SupabaseClient, user: User): Promise<Workspace> {
  const membership = await resolveCurrentMembership(supabase, user.id);
  const workspace = pickWorkspace(membership?.workspaces);

  if (!workspace) {
    throw new WorkspaceError('Çalışma alanı bulunamadı.', 'WORKSPACE_NOT_FOUND');
  }

  return workspace;
}

export async function getCurrentWorkspace(supabase: SupabaseClient, user: User): Promise<Workspace> {
  return bootstrapWorkspaceForUser(supabase, user);
}

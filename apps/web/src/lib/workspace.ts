import type { SupabaseClient, User } from '@supabase/supabase-js';

type Workspace = {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
};

export async function loadCurrentUser(supabase: SupabaseClient): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function bootstrapWorkspaceForUser(supabase: SupabaseClient, user: User): Promise<Workspace> {
  const profileUpsert = {
    id: user.id,
    email: user.email ?? null,
    full_name: user.user_metadata?.full_name ?? null,
  };

  const { error: profileError } = await supabase.from('profiles').upsert(profileUpsert, { onConflict: 'id' });
  if (profileError) {
    throw new Error(`Profil oluşturulamadı: ${profileError.message}`);
  }

  const { data: existingMember, error: memberLookupError } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces!inner(id, owner_id, name, created_at)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (memberLookupError) {
    throw new Error(`Workspace üyeliği okunamadı: ${memberLookupError.message}`);
  }

  if (existingMember?.workspaces) {
    const workspace = Array.isArray(existingMember.workspaces)
      ? existingMember.workspaces[0]
      : existingMember.workspaces;

    const { error: subError } = await supabase.from('subscriptions').upsert(
      {
        workspace_id: workspace.id,
        plan_name: 'starter',
        run_limit: 100,
        status: 'active',
      },
      { onConflict: 'workspace_id' }
    );

    if (subError) {
      throw new Error(`Abonelik başlatılamadı: ${subError.message}`);
    }

    return workspace as Workspace;
  }

  const workspaceName = `${(user.email ?? 'Yeni Kullanıcı').split('@')[0]} Workspace`;

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .insert({
      owner_id: user.id,
      name: workspaceName,
    })
    .select('*')
    .single();

  if (workspaceError || !workspace) {
    throw new Error(`Workspace oluşturulamadı: ${workspaceError?.message ?? 'Bilinmeyen hata'}`);
  }

  const { error: memberInsertError } = await supabase.from('workspace_members').upsert(
    {
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'owner',
    },
    { onConflict: 'workspace_id,user_id' }
  );

  if (memberInsertError) {
    throw new Error(`Workspace üyeliği oluşturulamadı: ${memberInsertError.message}`);
  }

  const { error: subscriptionError } = await supabase.from('subscriptions').upsert(
    {
      workspace_id: workspace.id,
      plan_name: 'starter',
      run_limit: 100,
      status: 'active',
    },
    { onConflict: 'workspace_id' }
  );

  if (subscriptionError) {
    throw new Error(`Abonelik oluşturulamadı: ${subscriptionError.message}`);
  }

  return workspace;
}

export async function getCurrentWorkspace(supabase: SupabaseClient, user: User): Promise<Workspace> {
  return bootstrapWorkspaceForUser(supabase, user);
}

import 'server-only';

import type { SupabaseClient, User } from '@supabase/supabase-js';

import type { WorkspaceContext } from '@/lib/workspace';

export function isDevAuthBypassEnabled() {
  return process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true';
}

export function getDevAuthBypassConfig() {
  if (!isDevAuthBypassEnabled()) {
    return null;
  }

  const userId = process.env.DEV_AUTH_BYPASS_USER_ID?.trim();
  const workspaceId = process.env.DEV_AUTH_BYPASS_WORKSPACE_ID?.trim();

  if (!userId || !workspaceId) {
    throw new Error('DEV_AUTH_BYPASS etkin ama DEV_AUTH_BYPASS_USER_ID veya DEV_AUTH_BYPASS_WORKSPACE_ID eksik.');
  }

  return {
    userId,
    workspaceId,
    email: process.env.DEV_AUTH_BYPASS_EMAIL?.trim() || 'dev-bypass@local.test',
    workspaceName: process.env.DEV_AUTH_BYPASS_WORKSPACE_NAME?.trim() || 'Dev Workspace',
    fullName: process.env.DEV_AUTH_BYPASS_FULL_NAME?.trim() || 'Dev Bypass User',
  };
}

export async function resolveDevBypassWorkspaceContext(supabase: SupabaseClient): Promise<WorkspaceContext> {
  const config = getDevAuthBypassConfig();

  if (!config) {
    throw new Error('Dev auth bypass aktif değil.');
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id, owner_id, name, created_at')
    .eq('id', config.workspaceId)
    .maybeSingle();

  if (workspaceError) {
    throw new Error(`Dev workspace okunamadı: ${workspaceError.message}`);
  }

  if (!workspace) {
    throw new Error(
      `DEV_AUTH_BYPASS_WORKSPACE_ID (${config.workspaceId}) veritabanında yok. Mevcut bir workspace id kullanın.`,
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', config.userId)
    .maybeSingle();

  const user: User = {
    id: config.userId,
    app_metadata: {},
    user_metadata: { full_name: config.fullName },
    aud: 'authenticated',
    created_at: workspace.created_at,
    email: profile?.email ?? config.email,
    role: 'authenticated',
  };

  return {
    user,
    workspace,
    profile: profile ?? {
      id: config.userId,
      email: config.email,
      full_name: config.fullName,
    },
  };
}

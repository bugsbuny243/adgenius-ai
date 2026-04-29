import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type AuthContext = {
  supabase: SupabaseClient;
  userId: string;
  userEmail: string | null;
  workspaceId: string;
};

function unauthorized(message: string) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function getApiAuthContext(request: Request): Promise<AuthContext | Response> {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    return unauthorized('Yetkisiz istek.');
  }

  const token = header.slice('Bearer '.length).trim();
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Sunucu ayarları eksik.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return unauthorized('Kullanıcı doğrulanamadı.');
  }

  const requestedWorkspaceId = request.headers.get('x-workspace-id')?.trim() ?? '';

  const { data: memberships, error: membershipsError } = await supabase
    .from('workspace_members')
    .select('workspace_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (membershipsError || !memberships?.length) {
    return unauthorized('Çalışma alanı bulunamadı.');
  }

  const membershipWorkspaceIds = new Set(
    memberships
      .map((membership) => (typeof membership.workspace_id === 'string' ? membership.workspace_id.trim() : ''))
      .filter(Boolean)
  );

  const workspaceId = requestedWorkspaceId && membershipWorkspaceIds.has(requestedWorkspaceId)
    ? requestedWorkspaceId
    : memberships[0]?.workspace_id;

  if (!workspaceId) {
    return unauthorized('Çalışma alanı bulunamadı.');
  }

  return { supabase, userId: user.id, userEmail: user.email ?? null, workspaceId };
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

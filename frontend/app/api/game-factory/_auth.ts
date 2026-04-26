import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type AuthContext = {
  supabase: SupabaseClient;
  userId: string;
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

  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership?.workspace_id) {
    return unauthorized('Çalışma alanı bulunamadı.');
  }

  return { supabase, userId: user.id, workspaceId: membership.workspace_id };
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

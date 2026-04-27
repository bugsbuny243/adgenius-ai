import { createClient } from '@supabase/supabase-js';
import type { Request, Response } from 'express';
import { loadEnv } from './env.js';

const env = loadEnv();

const anonAuthClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export const serviceRoleClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export type AuthContext = { userId: string; workspaceId: string; userEmail: string | null };

export async function requireAuth(req: Request, res: Response): Promise<AuthContext | null> {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ ok: false, error: 'Yetkisiz istek.' });
    return null;
  }

  const token = header.slice('Bearer '.length).trim();
  const {
    data: { user },
    error: userError
  } = await anonAuthClient.auth.getUser(token);

  if (userError || !user) {
    res.status(401).json({ ok: false, error: 'Kullanıcı doğrulanamadı.' });
    return null;
  }

  const { data: membership, error: membershipError } = await serviceRoleClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership?.workspace_id) {
    res.status(403).json({ ok: false, error: 'Çalışma alanı bulunamadı.' });
    return null;
  }

  return { userId: user.id, workspaceId: membership.workspace_id, userEmail: user.email ?? null };
}

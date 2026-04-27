import 'server-only';

import { createClient } from '@supabase/supabase-js';

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export function createSupabaseServiceRoleClient() {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVER_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase service role env eksik.');
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        'X-Client-Info': 'owner-service-role'
      }
    }
  });
}

export type JsonValue = Json;

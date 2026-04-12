'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getOptionalEnv } from '@/lib/env';

export function createSupabaseBrowserClient() {
  const url = getOptionalEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = getOptionalEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (!url || !key) {
    return null;
  }

  return createBrowserClient(url, key);
}

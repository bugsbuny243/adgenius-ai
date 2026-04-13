'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getPublicEnv } from '@/lib/env';

export function createSupabaseBrowserClient() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: key } = getPublicEnv();

  if (!url || !key) {
    return null;
  }

  return createBrowserClient(url, key);
}

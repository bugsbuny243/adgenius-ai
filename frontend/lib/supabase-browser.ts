'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getPublicEnv } from '@/lib/env';

type MissingPublicSupabaseConfig = {
  missingKeys: string[];
};

export function getMissingPublicSupabaseConfig(): MissingPublicSupabaseConfig {
  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: key } = getPublicEnv();
  const missingKeys = [
    !url ? 'NEXT_PUBLIC_SUPABASE_URL' : null,
    !key ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : null
  ].filter((value): value is string => value !== null);

  return { missingKeys };
}

export function createSupabaseBrowserClient() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: key } = getPublicEnv();

  if (!url || !key) {
    return null;
  }

  return createBrowserClient(url, key);
}

'use client';

import { createBrowserClient } from '@supabase/ssr';

type MissingPublicSupabaseConfig = {
  missingKeys: string[];
};

function readPublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null;

  return { url, key };
}

export function getMissingPublicSupabaseConfig(): MissingPublicSupabaseConfig {
  const { url, key } = readPublicSupabaseEnv();
  const missingKeys = [
    !url ? 'NEXT_PUBLIC_SUPABASE_URL' : null,
    !key ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : null
  ].filter((value): value is string => value !== null);

  return { missingKeys };
}

export function createSupabaseBrowserClient() {
  const { url, key } = readPublicSupabaseEnv();

  if (!url || !key) {
    return null;
  }

  return createBrowserClient(url, key);
}

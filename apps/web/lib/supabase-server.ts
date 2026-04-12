import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getOptionalEnv } from '@/lib/env';

function getSupabaseServerConfig() {
  const url = getOptionalEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = getOptionalEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function isSupabaseServerConfigured() {
  return getSupabaseServerConfig() !== null;
}

export async function createSupabaseServerClient() {
  const config = getSupabaseServerConfig();
  if (!config) {
    throw new Error('Supabase server client could not be initialized: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const cookieStore = await cookies();
  type CookieToSet = {
    name: string;
    value: string;
    options?: Parameters<typeof cookieStore.set>[2];
  };

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      }
    }
  });
}

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServerEnv } from '@/lib/env';

function getSupabaseServerConfig() {
  const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anonKey } = getServerEnv();

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
    throw new Error('Supabase server client could not be initialized: missing SUPABASE_URL or SUPABASE_ANON_KEY.');
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

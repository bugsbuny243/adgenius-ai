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

async function createSupabaseClient({ writableCookies }: { writableCookies: boolean }) {
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
        if (writableCookies) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
          return;
        }

        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies.
          // Middleware / Route Handlers / Server Actions handle session refresh writes.
        }
      }
    }
  });
}

export async function createSupabaseReadonlyServerClient() {
  return createSupabaseClient({ writableCookies: false });
}

export async function createSupabaseActionServerClient() {
  return createSupabaseClient({ writableCookies: true });
}

export async function createSupabaseServerClient() {
  return createSupabaseReadonlyServerClient();
}

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getPublicEnv } from '@/lib/env';

function getSupabaseServerConfig() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey } = getPublicEnv();

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL for Supabase server client.');
  }

  if (!anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY for Supabase server client.');
  }

  if (!url.startsWith('https://')) {
    throw new Error(`Invalid NEXT_PUBLIC_SUPABASE_URL protocol: expected https:// but received "${url}".`);
  }

  return { url, anonKey };
}

export function isSupabaseServerConfigured() {
  try {
    getSupabaseServerConfig();
    return true;
  } catch {
    return false;
  }
}

async function createSupabaseClient({ writableCookies }: { writableCookies: boolean }) {
  const config = getSupabaseServerConfig();

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

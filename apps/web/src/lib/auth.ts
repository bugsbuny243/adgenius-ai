import type { User } from '@supabase/supabase-js';

import { createBrowserSupabase } from '@/lib/supabase/client';

export async function signUpWithEmail(email: string, password: string) {
  return createBrowserSupabase().auth.signUp({ email, password });
}

export async function signInWithEmail(email: string, password: string) {
  return createBrowserSupabase().auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return createBrowserSupabase().auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
  } = await createBrowserSupabase().auth.getUser();

  return user;
}

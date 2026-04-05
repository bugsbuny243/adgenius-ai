import type { User } from '@supabase/supabase-js';

import { requireSupabaseClient, supabaseClient } from '@/lib/supabase/client';

export async function signUpWithEmail(email: string, password: string) {
  return requireSupabaseClient().auth.signUp({ email, password });
}

export async function signInWithEmail(email: string, password: string) {
  return requireSupabaseClient().auth.signInWithPassword({ email, password });
}

export async function signOut() {
  if (!supabaseClient) {
    return { error: null };
  }

  return supabaseClient.auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  if (!supabaseClient) {
    return null;
  }

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  return user;
}

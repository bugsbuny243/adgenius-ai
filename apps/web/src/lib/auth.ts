import type { User } from '@supabase/supabase-js';

import { supabaseClient } from '@/lib/supabase/client';

export async function signUpWithEmail(email: string, password: string) {
  return supabaseClient.auth.signUp({ email, password });
}

export async function signInWithEmail(email: string, password: string) {
  return supabaseClient.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabaseClient.auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  return user;
}

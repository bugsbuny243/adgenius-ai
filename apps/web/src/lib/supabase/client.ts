import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export class SupabaseEnvironmentError extends Error {
  constructor() {
    super('Supabase public environment variables are missing.');
    this.name = 'SupabaseEnvironmentError';
  }
}

let browserClient: SupabaseClient | null = null;

function getBrowserSupabaseEnv(): { supabaseUrl: string; supabaseAnonKey: string } {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new SupabaseEnvironmentError();
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function createBrowserSupabase(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getBrowserSupabaseEnv();

  browserClient = createClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}

export function requireSupabaseClient() {
  return createBrowserSupabase();
}

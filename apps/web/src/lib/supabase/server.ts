import "server-only";

import { createClient } from "@supabase/supabase-js";

export const createServerSupabaseClient = () => createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_ANON_KEY ?? "");

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { fetchWithTimeout, getBackendApiUrl } from '@/lib/backend-api';

export async function fetchBackendForOwner(path: string): Promise<Response> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const headers: HeadersInit = {};
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const url = `${getBackendApiUrl()}${path}`;

  return fetchWithTimeout(url, {
    method: 'GET',
    headers,
    cache: 'no-store'
  });
}

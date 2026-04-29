import { createSupabaseActionServerClient } from '@/lib/supabase-server';
import { getBackendApiUrl } from '@/lib/backend-api';

export async function PATCH(request: Request) {
  const supabase = await createSupabaseActionServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const response = await fetch(`${getBackendApiUrl()}/owner/payments`, {
    method: 'PATCH',
    headers: {
      'Content-Type': request.headers.get('content-type') ?? 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
    },
    body: await request.text(),
    cache: 'no-store'
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' }
  });
}

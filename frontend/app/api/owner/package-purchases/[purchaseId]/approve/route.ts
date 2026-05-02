import { createSupabaseActionServerClient } from '@/lib/supabase-server';
import { getBackendApiUrl } from '@/lib/backend-api';
import { isPlatformOwner } from '@/lib/owner-auth';

export async function PATCH(_request: Request, context: { params: Promise<{ purchaseId: string }> }) {
  const supabase = await createSupabaseActionServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!isPlatformOwner(user)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { purchaseId } = await context.params;
  const response = await fetch(`${getBackendApiUrl()}/owner/package-purchases/${purchaseId}/approve`, {
    method: 'PATCH',
    headers: {
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
    },
    cache: 'no-store'
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' }
  });
}

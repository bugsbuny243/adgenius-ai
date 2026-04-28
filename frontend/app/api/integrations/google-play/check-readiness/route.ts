import { createSupabaseActionServerClient } from '@/lib/supabase-server';
import { evaluateGooglePlayReadiness } from '@/lib/google-play-readiness';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseActionServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return json({ ok: false, error: 'Unauthorized' }, 401);

  const body = (await request.json().catch(() => ({}))) as {
    projectId?: string;
    packageName?: string;
    integrationId?: string;
  };

  const projectId = body.projectId?.trim();
  if (!projectId) return json({ ok: false, error: 'projectId zorunlu.' }, 400);

  const readiness = await evaluateGooglePlayReadiness({
    userId: user.id,
    projectId,
    packageName: body.packageName,
    integrationId: body.integrationId
  });

  return json({ ok: true, readiness });
}

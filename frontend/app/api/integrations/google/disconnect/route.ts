import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env';
import { resolveAppOrigin } from '@/lib/app-origin';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContextOrNull } from '@/lib/workspace';

export async function POST(request: Request) {
  const { SUPABASE_URL: supabaseUrl, SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey, APP_ORIGIN: appOriginEnv } = getServerEnv();
  const appOrigin = resolveAppOrigin({ appOrigin: appOriginEnv, requestUrl: request.url });

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.redirect(new URL('/connections?google=failed', appOrigin));
  }

  const workspace = await getWorkspaceContextOrNull();
  if (!workspace) {
    return NextResponse.redirect(new URL('/signin?google=auth_required', appOrigin));
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || user.id !== workspace.userId) {
    return NextResponse.redirect(new URL('/signin?google=failed', appOrigin));
  }

  const serviceSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { error } = await serviceSupabase
    .from('oauth_connections')
    .delete()
    .eq('workspace_id', workspace.workspaceId)
    .eq('user_id', workspace.userId)
    .eq('provider', 'google');

  if (error) {
    console.error('[google-disconnect] oauth delete failed', { code: error.code, message: error.message });
    return NextResponse.redirect(new URL('/connections?google=failed', appOrigin));
  }

  return NextResponse.redirect(new URL('/connections?google=disconnected', appOrigin));
}

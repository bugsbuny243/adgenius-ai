import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getEnv } from '@/lib/env';

function slugifyWorkspaceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextParam = requestUrl.searchParams.get('next');
  const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard';

  if (!code) {
    return NextResponse.redirect(new URL('/signin?error=missing_code', request.url));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return NextResponse.redirect(new URL(`/signin?error=${encodeURIComponent(exchangeError.message)}`, request.url));
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/signin?error=missing_user', request.url));
    }

    const service = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

    const emailName = user.email?.split('@')[0] ?? 'User';
    await service.from('profiles').upsert({ id: user.id, full_name: emailName }, { onConflict: 'id' });

    const { data: existingMembership } = await service
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    let workspaceId = existingMembership?.workspace_id;

    if (!workspaceId) {
      const workspaceName = `${emailName}'s Workspace`;
      const slugBase = slugifyWorkspaceName(workspaceName) || 'workspace';
      const workspaceSlug = `${slugBase}-${user.id.slice(0, 8)}`;

      const { data: workspace, error: workspaceError } = await service
        .from('workspaces')
        .insert({
          name: workspaceName,
          slug: workspaceSlug,
          owner_user_id: user.id
        })
        .select('id')
        .single();

      if (workspaceError || !workspace) {
        return NextResponse.redirect(new URL('/signin?error=workspace_bootstrap_failed', request.url));
      }

      workspaceId = workspace.id;

      await service.from('workspace_members').upsert(
        {
          workspace_id: workspaceId,
          user_id: user.id,
          role: 'owner'
        },
        { onConflict: 'workspace_id,user_id' }
      );

      await service.from('workspace_users').upsert(
        {
          workspace_id: workspaceId,
          user_id: user.id,
          display_name: emailName
        },
        { onConflict: 'workspace_id,user_id' }
      );

      await service.from('subscriptions').upsert(
        {
          workspace_id: workspaceId,
          plan_name: 'free',
          status: 'active',
          run_limit: 100
        },
        { onConflict: 'workspace_id' }
      );

      await service.from('usage_counters').upsert(
        {
          workspace_id: workspaceId,
          period_start: new Date().toISOString().slice(0, 10),
          runs_count: 0,
          tokens_input_count: 0,
          tokens_output_count: 0
        },
        { onConflict: 'workspace_id' }
      );
    }

    return NextResponse.redirect(new URL(next, request.url));
  } catch (error: unknown) {
    console.error('Auth callback failed.', error);
    return NextResponse.redirect(new URL('/signin?error=callback_failed', request.url));
  }
}

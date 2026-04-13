import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env';

function getTokenFromHeader(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length).trim() || null;
}

function buildWorkspaceName(email: string | undefined, userId: string): { baseName: string; fullName: string } {
  const baseName = (email?.split('@')[0] ?? `user-${userId.slice(0, 6)}`).trim() || `user-${userId.slice(0, 6)}`;
  return {
    baseName,
    fullName: `${baseName}'s Workspace`
  };
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

export async function POST(request: Request) {
  const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anonKey } = getServerEnv();

  if (!url || !anonKey) {
    console.error('[bootstrap] Supabase server configuration is missing.');
    return NextResponse.json({ ok: false, error: 'supabase_not_configured' }, { status: 500 });
  }

  const accessToken = getTokenFromHeader(request);
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 401 });
  }

  const supabase = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, error: 'invalid_user' }, { status: 401 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json({ ok: false, error: membershipError.message }, { status: 400 });
  }

  if (membership?.workspace_id) {
    return NextResponse.json({ ok: true, existing: true, workspaceId: membership.workspace_id });
  }

  const { baseName, fullName } = buildWorkspaceName(user.email, user.id);
  const baseSlug = `ws-${user.id.slice(0, 12)}`;

  let workspaceId = '';
  let slugCandidate = baseSlug;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name: fullName,
        slug: slugCandidate,
        owner_id: user.id
      })
      .select('id')
      .single();

    if (!workspaceError && workspace) {
      workspaceId = workspace.id;
      break;
    }

    if (workspaceError?.code === '23505') {
      slugCandidate = `${baseSlug}-${randomSuffix()}`;
      continue;
    }

    return NextResponse.json({ ok: false, error: workspaceError?.message ?? 'workspace_insert_failed' }, { status: 400 });
  }

  if (!workspaceId) {
    return NextResponse.json({ ok: false, error: 'workspace_slug_conflict' }, { status: 409 });
  }

  const { error: memberInsertError } = await supabase.from('workspace_members').insert({
    workspace_id: workspaceId,
    user_id: user.id,
    role: 'owner'
  });

  if (memberInsertError) {
    return NextResponse.json({ ok: false, error: memberInsertError.message }, { status: 400 });
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
    full_name: baseName
  });

  if (profileError) {
    return NextResponse.json({ ok: false, error: profileError.message }, { status: 400 });
  }

  const { error: subscriptionError } = await supabase.from('subscriptions').insert({
    workspace_id: workspaceId,
    plan_name: 'free',
    run_limit: 30,
    status: 'active'
  });

  if (subscriptionError) {
    return NextResponse.json({ ok: false, error: subscriptionError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, workspaceId });
}

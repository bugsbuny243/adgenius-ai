import 'server-only';

import { getMonthKey } from '@/lib/usage';
import { createServerSupabase, createServerSupabaseAdmin } from '@/lib/supabase/server';
import { resolveDevBypassWorkspaceContext, isDevAuthBypassEnabled } from '@/lib/dev-session';
import { resolveWorkspaceContext } from '@/lib/workspace';

function getAccessToken(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.replace('Bearer ', '').trim();
}

export async function resolveRequestContext(request: Request) {
  const accessToken = getAccessToken(request);

  if (accessToken) {
    const supabase = createServerSupabase(accessToken);
    const context = await resolveWorkspaceContext(supabase);
    return { supabase, context };
  }

  if (isDevAuthBypassEnabled()) {
    const supabase = createServerSupabaseAdmin();
    const context = await resolveDevBypassWorkspaceContext(supabase);
    return { supabase, context };
  }

  throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
}

export async function fetchDashboardData(request: Request) {
  const { supabase, context } = await resolveRequestContext(request);
  const monthKey = getMonthKey();

  const [
    { data: subscription },
    { data: usage },
    { data: activeAgents },
    { data: latestRuns },
    { data: savedOutputs, count: savedCount },
  ] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('plan_name, run_limit, status')
      .eq('workspace_id', context.workspace.id)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('usage_counters')
      .select('runs_count')
      .eq('workspace_id', context.workspace.id)
      .eq('month_key', monthKey)
      .maybeSingle(),
    supabase.from('agent_types').select('id, slug, name, description, icon').eq('is_active', true).order('name', { ascending: true }),
    supabase
      .from('agent_runs')
      .select('id, created_at, status, agent_types(name, slug)')
      .eq('workspace_id', context.workspace.id)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('saved_outputs')
      .select('id, title, created_at, agent_runs(agent_types(name, slug))', { count: 'exact' })
      .eq('workspace_id', context.workspace.id)
      .order('created_at', { ascending: false })
      .limit(6),
  ]);

  return {
    monthKey,
    subscription,
    usage,
    activeAgents: activeAgents ?? [],
    latestRuns: latestRuns ?? [],
    savedOutputs: savedOutputs ?? [],
    savedCount: savedCount ?? 0,
  };
}

export async function fetchAgentCatalog(request: Request) {
  const { supabase } = await resolveRequestContext(request);
  const { data, error } = await supabase
    .from('agent_types')
    .select('id, slug, name, icon, description')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchAgentType(request: Request, slug: string) {
  const { supabase } = await resolveRequestContext(request);
  const { data, error } = await supabase
    .from('agent_types')
    .select('id, slug, name, icon, description, placeholder, is_active')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function fetchRuns(request: Request) {
  const { supabase, context } = await resolveRequestContext(request);
  const { data, error } = await supabase
    .from('agent_runs')
    .select('id, status, user_input, result_text, created_at, agent_types(name, slug)')
    .eq('workspace_id', context.workspace.id)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchSaved(request: Request) {
  const { supabase, context } = await resolveRequestContext(request);
  const { data, error } = await supabase
    .from('saved_outputs')
    .select('id, title, content, created_at, agent_runs(agent_types(name, slug))')
    .eq('workspace_id', context.workspace.id)
    .eq('user_id', context.user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data ?? [];
}

import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'approved']);
const PAID_PLAN_NAMES = new Set(['starter', 'pro', 'studio', 'enterprise']);

export const GAME_AGENT_PACKAGE_REQUIRED_MESSAGE = 'Bu işlem için aktif Game Agent paketi gerekir.';

export async function hasActiveGameAgentPackage(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, plan_name')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const subscriptionStatus = String(subscription?.status ?? '').toLowerCase();
  const planName = String(subscription?.plan_name ?? '').toLowerCase();
  return ACTIVE_SUBSCRIPTION_STATUSES.has(subscriptionStatus) && PAID_PLAN_NAMES.has(planName);
}

export async function requireActiveGameAgentPackage(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<Response | null> {
  const active = await hasActiveGameAgentPackage(supabase, userId, workspaceId);
  if (active) return null;

  return new Response(JSON.stringify({ ok: false, error: GAME_AGENT_PACKAGE_REQUIRED_MESSAGE }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' }
  });
}

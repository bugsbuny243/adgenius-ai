import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'approved']);

export const GAME_AGENT_PACKAGE_REQUIRED_MESSAGE = 'Bu işlem için aktif Game Agent paketi gerekir.';

export async function hasActiveGameAgentPackage(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const [{ data: subscription }, { data: approvedOrder }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('status, plan_name')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('payment_orders')
      .select('status')
      .eq('user_id', userId)
      .eq('provider', 'shopier')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  const subscriptionStatus = String(subscription?.status ?? '').toLowerCase();
  const planName = String(subscription?.plan_name ?? '').toLowerCase();
  const subscriptionLooksActive = ACTIVE_SUBSCRIPTION_STATUSES.has(subscriptionStatus) && planName !== 'free';

  return subscriptionLooksActive || Boolean(approvedOrder);
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

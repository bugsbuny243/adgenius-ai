import type { SupabaseClient } from '@supabase/supabase-js';

export function getMonthKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export type UsageStatus = {
  planName: string;
  runLimit: number;
  runsCount: number;
  remaining: number;
  isExceeded: boolean;
  monthKey: string;
};

export async function getUsageStatus(
  supabase: SupabaseClient,
  workspaceId: string,
  monthKey = getMonthKey()
): Promise<UsageStatus> {
  if (!workspaceId) {
    throw new Error('Çalışma alanı bulunamadı.');
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('plan_name, run_limit, status')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .maybeSingle();

  if (subscriptionError) {
    throw new Error(`Abonelik bilgisi alınamadı: ${subscriptionError.message}`);
  }

  if (!subscription) {
    throw new Error('Aktif abonelik bulunamadı.');
  }

  const { data: counter, error: counterError } = await supabase
    .from('usage_counters')
    .select('id, runs_count')
    .eq('workspace_id', workspaceId)
    .eq('month_key', monthKey)
    .maybeSingle();

  if (counterError) {
    throw new Error(`Kullanım bilgisi alınamadı: ${counterError.message}`);
  }

  const runsCount = counter?.runs_count ?? 0;

  return {
    planName: subscription.plan_name,
    runLimit: subscription.run_limit,
    runsCount,
    remaining: Math.max(0, subscription.run_limit - runsCount),
    isExceeded: runsCount >= subscription.run_limit,
    monthKey,
  };
}

export async function assertCanRun(supabase: SupabaseClient, workspaceId: string): Promise<UsageStatus> {
  const usage = await getUsageStatus(supabase, workspaceId);

  if (usage.isExceeded) {
    throw new Error('Aylık kullanım limitine ulaştınız.');
  }

  return usage;
}

export async function incrementMonthlyUsage(
  supabase: SupabaseClient,
  workspaceId: string,
  monthKey = getMonthKey()
): Promise<number> {
  const { data, error } = await supabase.rpc('increment_usage_counter', {
    p_workspace_id: workspaceId,
    p_month_key: monthKey,
  });

  if (error) {
    throw new Error(`Kullanım sayacı güncellenemedi: ${error.message}`);
  }

  return data as number;
}

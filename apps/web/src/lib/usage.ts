import type { SupabaseClient } from '@supabase/supabase-js';

export function getMonthKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function getDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export type UsageLimitPeriod = 'day' | 'month';

export const FREE_DAILY_RUN_LIMIT = 5;

export class UsageLimitError extends Error {
  constructor(
    message: string,
    public readonly usage: UsageStatus
  ) {
    super(message);
    this.name = 'UsageLimitError';
  }
}

export type UsageStatus = {
  planName: string;
  period: UsageLimitPeriod;
  runLimit: number;
  runsCount: number;
  remaining: number;
  isExceeded: boolean;
  periodKey: string;
  limitMessage: string;
};

function getPeriodKey(period: UsageLimitPeriod, date = new Date()) {
  return period === 'day' ? getDayKey(date) : getMonthKey(date);
}

function formatLimitMessage(usage: Pick<UsageStatus, 'runLimit' | 'period' | 'planName'>) {
  const periodLabel = usage.period === 'day' ? 'günlük' : 'aylık';
  return `${usage.planName} planı için ${usage.runLimit} ${periodLabel} çalıştırma limitine ulaştınız. Planınızı yükselterek devam edebilirsiniz.`;
}

function resolveLimitPolicy(subscription: {
  plan_name: string;
  run_limit: number;
} | null): { planName: string; runLimit: number; period: UsageLimitPeriod } {
  if (!subscription) {
    return {
      planName: 'free',
      runLimit: FREE_DAILY_RUN_LIMIT,
      period: 'day',
    };
  }

  const planName = subscription.plan_name || 'starter';
  const isFreePlan = planName.toLowerCase() === 'free';

  return {
    planName,
    runLimit: Math.max(0, subscription.run_limit),
    period: isFreePlan ? 'day' : 'month',
  };
}

export async function getUsageStatus(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<UsageStatus> {
  if (!workspaceId) {
    throw new Error('Çalışma alanı bulunamadı.');
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('plan_name, run_limit')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .maybeSingle();

  if (subscriptionError) {
    throw new Error(`Abonelik bilgisi alınamadı: ${subscriptionError.message}`);
  }

  const policy = resolveLimitPolicy(subscription);
  const periodKey = getPeriodKey(policy.period);

  const { data: counter, error: counterError } = await supabase
    .from('usage_counters')
    .select('id, runs_count')
    .eq('workspace_id', workspaceId)
    .eq('month_key', periodKey)
    .maybeSingle();

  if (counterError) {
    throw new Error(`Kullanım bilgisi alınamadı: ${counterError.message}`);
  }

  const runsCount = counter?.runs_count ?? 0;

  return {
    planName: policy.planName,
    period: policy.period,
    runLimit: policy.runLimit,
    runsCount,
    remaining: Math.max(0, policy.runLimit - runsCount),
    isExceeded: runsCount >= policy.runLimit,
    periodKey,
    limitMessage: formatLimitMessage({
      planName: policy.planName,
      runLimit: policy.runLimit,
      period: policy.period,
    }),
  };
}

export async function assertCanRun(supabase: SupabaseClient, workspaceId: string): Promise<UsageStatus> {
  const usage = await getUsageStatus(supabase, workspaceId);

  if (usage.isExceeded) {
    throw new UsageLimitError(usage.limitMessage, usage);
  }

  return usage;
}

export async function incrementUsageCounter(
  supabase: SupabaseClient,
  workspaceId: string,
  periodKey: string
): Promise<number> {
  const { data: existing, error: existingError } = await supabase
    .from('usage_counters')
    .select('id, runs_count')
    .eq('workspace_id', workspaceId)
    .eq('month_key', periodKey)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Kullanım sayacı okunamadı: ${existingError.message}`);
  }

  if (!existing) {
    const { data: inserted, error: insertError } = await supabase
      .from('usage_counters')
      .insert({
        workspace_id: workspaceId,
        month_key: periodKey,
        runs_count: 1,
      })
      .select('runs_count')
      .single();

    if (insertError || !inserted) {
      throw new Error(`Kullanım sayacı oluşturulamadı: ${insertError?.message ?? 'Bilinmeyen hata'}`);
    }

    return inserted.runs_count;
  }

  const nextRunsCount = existing.runs_count + 1;
  const { data: updated, error: updateError } = await supabase
    .from('usage_counters')
    .update({ runs_count: nextRunsCount, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
    .select('runs_count')
    .single();

  if (updateError || !updated) {
    throw new Error(`Kullanım sayacı güncellenemedi: ${updateError?.message ?? 'Bilinmeyen hata'}`);
  }

  return updated.runs_count;
}

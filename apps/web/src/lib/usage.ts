import type { SupabaseClient } from '@supabase/supabase-js';

export function getMonthKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

type UsageStatus = {
  planName: string;
  runLimit: number;
  runsCount: number;
  remaining: number;
  isExceeded: boolean;
};

export async function getUsageStatus(
  supabase: SupabaseClient,
  workspaceId: string,
  monthKey = getMonthKey()
): Promise<UsageStatus> {
  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('plan_name, run_limit')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (subscriptionError) {
    throw new Error(`Abonelik bilgisi alınamadı: ${subscriptionError.message}`);
  }

  const planName = subscription?.plan_name ?? 'starter';
  const runLimit = subscription?.run_limit ?? 100;

  const { data: counter, error: counterError } = await supabase
    .from('usage_counters')
    .select('runs_count')
    .eq('workspace_id', workspaceId)
    .eq('month_key', monthKey)
    .maybeSingle();

  if (counterError) {
    throw new Error(`Kullanım bilgisi alınamadı: ${counterError.message}`);
  }

  const runsCount = counter?.runs_count ?? 0;

  return {
    planName,
    runLimit,
    runsCount,
    remaining: Math.max(0, runLimit - runsCount),
    isExceeded: runsCount >= runLimit,
  };
}

export async function assertCanRun(supabase: SupabaseClient, workspaceId: string): Promise<UsageStatus> {
  const usage = await getUsageStatus(supabase, workspaceId);

  if (usage.isExceeded) {
    throw new Error('Aylık çalıştırma limitine ulaştınız. Lütfen planınızı yükseltin.');
  }

  return usage;
}

export async function incrementMonthlyUsage(
  supabase: SupabaseClient,
  workspaceId: string,
  monthKey = getMonthKey()
): Promise<number> {
  const { data: existing, error: existingError } = await supabase
    .from('usage_counters')
    .select('id, runs_count')
    .eq('workspace_id', workspaceId)
    .eq('month_key', monthKey)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Kullanım sayacı okunamadı: ${existingError.message}`);
  }

  if (!existing) {
    const { data: inserted, error: insertError } = await supabase
      .from('usage_counters')
      .insert({
        workspace_id: workspaceId,
        month_key: monthKey,
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
    .update({
      runs_count: nextRunsCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .select('runs_count')
    .single();

  if (updateError || !updated) {
    throw new Error(`Kullanım sayacı güncellenemedi: ${updateError?.message ?? 'Bilinmeyen hata'}`);
  }

  return updated.runs_count;
}

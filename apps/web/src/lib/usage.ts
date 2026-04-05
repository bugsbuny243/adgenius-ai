import { createClient } from '@/src/lib/supabase/server'

function getMonthKey() {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

export async function assertUsageWithinLimit(workspaceId: string) {
  const supabase = await createClient()
  const monthKey = getMonthKey()

  const [{ data: subscription }, { data: usage }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('task_limit,status')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('usage_counters')
      .select('runs_count')
      .eq('workspace_id', workspaceId)
      .eq('month_key', monthKey)
      .maybeSingle(),
  ])

  const limit = subscription?.task_limit ?? 100
  const used = usage?.runs_count ?? 0

  if (used >= limit) {
    throw new Error('Aylık kullanım limitine ulaşıldı.')
  }

  return { limit, used }
}

export async function incrementUsageCounter(workspaceId: string) {
  const supabase = await createClient()
  const monthKey = getMonthKey()

  const { data } = await supabase
    .from('usage_counters')
    .select('id,runs_count')
    .eq('workspace_id', workspaceId)
    .eq('month_key', monthKey)
    .maybeSingle()

  if (!data) {
    await supabase.from('usage_counters').insert({
      workspace_id: workspaceId,
      month_key: monthKey,
      runs_count: 1,
    })
    return
  }

  await supabase
    .from('usage_counters')
    .update({ runs_count: (data.runs_count ?? 0) + 1 })
    .eq('id', data.id)
}

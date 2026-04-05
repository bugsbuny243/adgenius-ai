import Link from 'next/link'
import { requireUser, getUserWorkspaceId } from '@/src/lib/auth'
import { createClient } from '@/src/lib/supabase/server'

export default async function DashboardPage() {
  const user = await requireUser()
  const workspaceId = await getUserWorkspaceId(user.id)
  const supabase = await createClient()

  const [{ data: runs }, { data: saved }, { data: agentTypes }, { data: subscription }, { data: usage }] =
    await Promise.all([
      supabase
        .from('agent_runs')
        .select('id,status,created_at,agent_types(name)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('saved_outputs')
        .select('id,title,created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('agent_types').select('id,name,slug').eq('is_active', true),
      supabase
        .from('subscriptions')
        .select('plan_name,task_limit,status')
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('usage_counters')
        .select('runs_count,month_key')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  return (
    <div className="space-y-4">
      <h1 className="page-title">Dashboard</h1>

      <section className="panel">
        <h2>Kullanım Özeti</h2>
        <p className="muted">
          Plan: {subscription?.plan_name ?? 'Başlangıç'} • Kullanım: {usage?.runs_count ?? 0}/{subscription?.task_limit ?? 100} run
        </p>
      </section>

      <section className="panel">
        <h2>Aktif Agent Türleri</h2>
        <div className="card-grid">
          {(agentTypes ?? []).map((agent: any) => (
            <Link className="mini-card" key={agent.id} href={`/agents/${agent.slug}`}>
              <strong>{agent.name}</strong>
              <p className="muted">Çalıştır</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Son Runlar</h2>
        <ul>
          {(runs ?? []).map((run: any) => (
            <li key={run.id}>
              <Link href={`/runs/${run.id}`}>
                {(run.agent_types as { name?: string } | null)?.name ?? 'Agent'} — {run.status} — {new Date(run.created_at).toLocaleString('tr-TR')}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Kaydedilen Çıktılar</h2>
        <ul>
          {(saved ?? []).map((item: any) => (
            <li key={item.id}>
              {item.title} — {new Date(item.created_at).toLocaleString('tr-TR')}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

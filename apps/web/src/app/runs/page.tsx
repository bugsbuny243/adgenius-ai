import Link from 'next/link'
import { createClient } from '@/src/lib/supabase/server'
import { getUserWorkspaceId, requireUser } from '@/src/lib/auth'

export default async function RunsPage() {
  const user = await requireUser()
  const workspaceId = await getUserWorkspaceId(user.id)
  const supabase = await createClient()

  const { data: runs } = await supabase
    .from('agent_runs')
    .select('id,status,created_at,model_name,agent_types(name)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  return (
    <section className="space-y-4">
      <h1 className="page-title">Run Geçmişi</h1>
      <div className="panel">
        <ul>
          {(runs ?? []).map((run: any) => (
            <li key={run.id}>
              <Link href={`/runs/${run.id}`}>
                {(run.agent_types as { name?: string } | null)?.name ?? 'Agent'} • {run.status} • {run.model_name} •{' '}
                {new Date(run.created_at).toLocaleString('tr-TR')}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

import { notFound } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getUserWorkspaceId, requireUser } from '@/src/lib/auth'

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const workspaceId = await getUserWorkspaceId(user.id)
  const { id } = await params
  const supabase = await createClient()

  const { data: run } = await supabase
    .from('agent_runs')
    .select('id,user_input,result_text,status,model_name,created_at,agent_types(name)')
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .maybeSingle()

  if (!run) {
    notFound()
  }

  return (
    <section className="space-y-4">
      <div className="panel">
        <h1 className="page-title">Run Detayı</h1>
        <p className="muted">
          {(run.agent_types as { name?: string } | null)?.name ?? 'Agent'} • {run.status} • {new Date(run.created_at).toLocaleString('tr-TR')}
        </p>
      </div>
      <div className="panel">
        <h2>Girdi</h2>
        <pre className="output-pre">{run.user_input}</pre>
      </div>
      <div className="panel">
        <h2>Çıktı</h2>
        <pre className="output-pre">{run.result_text}</pre>
      </div>
    </section>
  )
}

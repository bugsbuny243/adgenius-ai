import { createClient } from '@/src/lib/supabase/server'
import { getUserWorkspaceId, requireUser } from '@/src/lib/auth'

export default async function SavedPage() {
  const user = await requireUser()
  const workspaceId = await getUserWorkspaceId(user.id)
  const supabase = await createClient()

  const { data: outputs } = await supabase
    .from('saved_outputs')
    .select('id,title,content,created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  return (
    <section className="space-y-4">
      <h1 className="page-title">Kaydedilen Çıktılar</h1>
      <div className="space-y-3">
        {(outputs ?? []).map((output: any) => (
          <article className="panel" key={output.id}>
            <h2>{output.title}</h2>
            <p className="muted">{new Date(output.created_at).toLocaleString('tr-TR')}</p>
            <pre className="output-pre">{output.content}</pre>
          </article>
        ))}
      </div>
    </section>
  )
}

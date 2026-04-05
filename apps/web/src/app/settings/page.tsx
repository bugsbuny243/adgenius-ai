import { createClient } from '@/src/lib/supabase/server'
import { getUserWorkspaceId, requireUser } from '@/src/lib/auth'

export default async function SettingsPage() {
  const user = await requireUser()
  const workspaceId = await getUserWorkspaceId(user.id)
  const supabase = await createClient()

  const [{ data: profile }, { data: membership }, { data: subscription }] = await Promise.all([
    supabase.from('profiles').select('email,full_name,created_at').eq('id', user.id).maybeSingle(),
    supabase
      .from('workspace_members')
      .select('role,created_at')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select('plan_name,status,task_limit')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return (
    <section className="space-y-4">
      <h1 className="page-title">Ayarlar</h1>
      <div className="panel">
        <h2>Profil</h2>
        <p>E-posta: {profile?.email ?? user.email}</p>
        <p>Ad Soyad: {profile?.full_name ?? '-'}</p>
      </div>
      <div className="panel">
        <h2>Workspace</h2>
        <p>ID: {workspaceId}</p>
        <p>Rol: {membership?.role ?? 'member'}</p>
      </div>
      <div className="panel">
        <h2>Plan</h2>
        <p>{subscription?.plan_name ?? 'Başlangıç'} • {subscription?.status ?? 'active'}</p>
        <p>Aylık limit: {subscription?.task_limit ?? 100} run</p>
      </div>
    </section>
  )
}

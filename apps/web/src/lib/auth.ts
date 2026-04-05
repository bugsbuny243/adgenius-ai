import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

export async function requireUser() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return user
}

export async function getUserWorkspaceId(userId: string) {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (membership?.workspace_id) {
    return membership.workspace_id as string
  }

  const { data: createdWorkspace, error: workspaceError } = await supabase
    .from('workspaces')
    .insert({ owner_id: userId, name: 'Kişisel Çalışma Alanım' })
    .select('id')
    .single()

  if (workspaceError) {
    throw new Error(workspaceError.message)
  }

  await supabase.from('workspace_members').insert({
    workspace_id: createdWorkspace.id,
    user_id: userId,
    role: 'owner',
  })

  await supabase.from('subscriptions').insert({
    workspace_id: createdWorkspace.id,
    plan_name: 'Başlangıç',
    task_limit: 100,
    status: 'active',
  })

  return createdWorkspace.id as string
}

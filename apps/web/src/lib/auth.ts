import { cookies } from 'next/headers'

export async function getSessionUser() {
  const cookieStore = await cookies()
  return {
    id: cookieStore.get('agentforge_user_id')?.value ?? 'demo-user',
    organizationId: cookieStore.get('agentforge_org_id')?.value ?? 'demo-org',
    email: 'demo@agentforge.local',
    name: 'Demo User',
  }
}

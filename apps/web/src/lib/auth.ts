import { cookies } from 'next/headers'

export async function getSessionUser() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('opera_user_id')?.value ?? 'demo-user'
  return {
    id: userId,
    email: 'demo@operaai.app',
    name: 'Demo User',
  }
}

export type SessionUser = {
  id: string
  email: string
  organizationId: string
}

/**
 * Placeholder auth helper for canonical web runtime.
 * Replace with your production auth provider and session verification.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  return {
    id: 'local-dev-user',
    email: 'dev@agentforge.local',
    organizationId: 'local-dev-org',
  }
}

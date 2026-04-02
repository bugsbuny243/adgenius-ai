import { apiGet } from '../../lib/api-client'

export default async function AdminPage() {
  const live = await apiGet('/api/v1/live-campaigns')
  return <pre className="p-6 text-sm">{JSON.stringify(live, null, 2)}</pre>
}

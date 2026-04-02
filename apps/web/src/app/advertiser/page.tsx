import { apiGet } from '../../lib/api-client'

export default async function AdvertiserPage() {
  const campaigns = await apiGet('/api/v1/campaigns')
  return <pre className="p-6 text-sm">{JSON.stringify(campaigns, null, 2)}</pre>
}

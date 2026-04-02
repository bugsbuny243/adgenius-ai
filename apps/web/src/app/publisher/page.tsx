import { apiGet } from '../../lib/api-client'

export default async function PublisherPage() {
  const publisher = await apiGet('/api/v1/publishers/me')
  return <pre className="p-6 text-sm">{JSON.stringify(publisher, null, 2)}</pre>
}

import { db } from '@/src/lib/db'

export default async function AssetsPage() {
  const assets = await db.asset.findMany({ orderBy: { createdAt: 'desc' } })
  return <div><h1 className="text-3xl font-bold">Assets</h1><ul className="mt-4 space-y-2">{assets.map((asset) => <li key={asset.id}>{asset.fileName} ({asset.type})</li>)}</ul></div>
}

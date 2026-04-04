import Link from 'next/link'
import { db } from '@/src/lib/db'

export default async function RunsPage() {
  const runs = await db.run.findMany({ include: { agent: true }, orderBy: { createdAt: 'desc' }, take: 30 })
  return <div className="space-y-4"><h1 className="text-3xl font-semibold">Runs</h1><ul>{runs.map((r) => <li key={r.id}><Link href={`/runs/${r.id}`}>{r.agent.name} - {r.status}</Link></li>)}</ul></div>
}

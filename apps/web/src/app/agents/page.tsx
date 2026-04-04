import Link from 'next/link'
import { db } from '@/src/lib/db'

export default async function AgentsPage() {
  const agents = await db.agent.findMany({ orderBy: { createdAt: 'desc' } })
  return <div className="space-y-4"><h1 className="text-3xl font-semibold">Agents</h1><Link href="/agents/new" className="underline">Yeni Agent</Link><ul>{agents.map((a) => <li key={a.id}><Link href={`/agents/${a.id}`}>{a.name}</Link></li>)}</ul></div>
}

import { notFound } from 'next/navigation'
import { db } from '@/src/lib/db'

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const agent = await db.agent.findUnique({ where: { id }, include: { runs: { take: 10, orderBy: { createdAt: 'desc' } } } })
  if (!agent) notFound()

  return <div className="space-y-3"><h1 className="text-3xl font-semibold">{agent.name}</h1><p>{agent.description}</p><div className="panel">Recent runs: {agent.runs.length}</div></div>
}

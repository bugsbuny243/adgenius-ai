import { notFound } from 'next/navigation'
import { db } from '@/src/lib/db'

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const run = await db.run.findUnique({ where: { id }, include: { steps: true, approvals: true } })
  if (!run) notFound()

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Run #{run.id.slice(0, 8)}</h1>
      <div className="panel">Summary: {run.summary ?? 'No summary'}</div>
      <div className="panel">Tasks: {JSON.stringify(run.proposedTasks)}</div>
      <div className="panel">Risks: {JSON.stringify(run.risks)}</div>
      <div className="panel">Missing fields: {JSON.stringify(run.missingFields)}</div>
    </div>
  )
}

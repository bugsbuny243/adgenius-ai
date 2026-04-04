import { db } from '@/src/lib/db'

export default async function DashboardPage() {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const [tasks, runs, approvals, workItems, riskyRuns] = await Promise.all([
    db.task.findMany({ where: { dueDate: { gte: startOfDay } }, take: 6, orderBy: { dueDate: 'asc' } }),
    db.run.findMany({ take: 6, orderBy: { createdAt: 'desc' } }),
    db.approval.findMany({ where: { status: 'PENDING' }, take: 6, orderBy: { createdAt: 'desc' } }),
    db.workItem.findMany({ take: 6, orderBy: { createdAt: 'desc' } }),
    db.run.findMany({ where: { risks: { not: null } }, take: 6, orderBy: { createdAt: 'desc' } }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="panel"><h2 className="font-semibold">Today&apos;s tasks</h2><ul>{tasks.map((x) => <li key={x.id}>{x.title}</li>)}</ul></section>
        <section className="panel"><h2 className="font-semibold">Recent agent runs</h2><ul>{runs.map((x) => <li key={x.id}>{x.status}</li>)}</ul></section>
        <section className="panel"><h2 className="font-semibold">Pending approvals</h2><ul>{approvals.map((x) => <li key={x.id}>{x.title}</li>)}</ul></section>
        <section className="panel"><h2 className="font-semibold">Recent work items</h2><ul>{workItems.map((x) => <li key={x.id}>{x.title}</li>)}</ul></section>
      </div>
      <section className="panel"><h2 className="font-semibold">Flagged/risky outputs</h2><ul>{riskyRuns.map((x) => <li key={x.id}>{x.summary ?? 'Risk flagged'}</li>)}</ul></section>
    </div>
  )
}

import { db } from '@/src/lib/db'

export default async function DashboardPage() {
  const [tasks, assets, workItems, upcoming, risky] = await Promise.all([
    db.task.findMany({ take: 10, orderBy: { dueDate: 'asc' } }),
    db.asset.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
    db.workItem.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
    db.timeline.findMany({ where: { eventDate: { gte: new Date() } }, take: 5, orderBy: { eventDate: 'asc' } }),
    db.aiExtraction.findMany({ where: { riskFlags: { not: [] } }, take: 5, orderBy: { createdAt: 'desc' } }),
  ])

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid gap-5 md:grid-cols-2">
        <section><h2 className="font-semibold">Today&apos;s tasks</h2><ul>{tasks.map((t) => <li key={t.id}>{t.title}</li>)}</ul></section>
        <section><h2 className="font-semibold">Recent uploads</h2><ul>{assets.map((a) => <li key={a.id}>{a.fileName}</li>)}</ul></section>
        <section><h2 className="font-semibold">Recent work items</h2><ul>{workItems.map((w) => <li key={w.id}>{w.title}</li>)}</ul></section>
        <section><h2 className="font-semibold">Upcoming dates</h2><ul>{upcoming.map((u) => <li key={u.id}>{u.title}</li>)}</ul></section>
      </div>
      <section><h2 className="font-semibold">Flagged / risky items</h2><ul>{risky.map((r) => <li key={r.id}>{r.summary.slice(0, 90)}</li>)}</ul></section>
    </div>
  )
}

import { db } from '@/src/lib/db'

export default async function TasksPage() {
  const tasks = await db.task.findMany({ orderBy: { createdAt: 'desc' }, take: 30 })
  return <div className="space-y-4"><h1 className="text-3xl font-semibold">Tasks</h1><ul>{tasks.map((t) => <li key={t.id}>{t.title} - {t.status}</li>)}</ul></div>
}

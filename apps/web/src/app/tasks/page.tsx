import { db } from '@/src/lib/db'

export default async function TasksPage() {
  const tasks = await db.task.findMany({ include: { workItem: true }, orderBy: { createdAt: 'desc' } })
  return <div><h1 className="text-3xl font-bold">Tasks</h1><ul className="mt-4 space-y-2">{tasks.map((task) => <li key={task.id}>{task.title} ({task.workItem?.title ?? 'No work item'})</li>)}</ul></div>
}

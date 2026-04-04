import { db } from '@/src/lib/db'

export default async function KnowledgePage() {
  const sources = await db.knowledgeSource.findMany({ orderBy: { createdAt: 'desc' }, take: 20 })
  return <div className="space-y-4"><h1 className="text-3xl font-semibold">Knowledge</h1><ul>{sources.map((s) => <li key={s.id}>{s.title}</li>)}</ul></div>
}

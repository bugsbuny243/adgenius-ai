import { notFound } from 'next/navigation'
import { db } from '@/src/lib/db'

export default async function WorkItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await db.workItem.findUnique({ where: { id }, include: { tasks: true, notes: true, timelines: true, assets: true } })
  if (!item) notFound()
  return <div className="space-y-3"><h1 className="text-3xl font-bold">{item.title}</h1><p>{item.summary}</p></div>
}

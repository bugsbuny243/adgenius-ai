import { notFound } from 'next/navigation'
import { db } from '@/src/lib/db'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const customer = await db.customer.findUnique({ where: { id }, include: { workItems: true, notes: true, timelines: true } })
  if (!customer) notFound()
  return <div><h1 className="text-3xl font-bold">{customer.name}</h1><p className="mt-3">İş sayısı: {customer.workItems.length}</p></div>
}

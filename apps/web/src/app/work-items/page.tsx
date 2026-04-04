import Link from 'next/link'
import { db } from '@/src/lib/db'

export default async function WorkItemsPage() {
  const workItems = await db.workItem.findMany({ include: { customer: true }, orderBy: { createdAt: 'desc' } })
  return <div><h1 className="text-3xl font-bold">Work items</h1><ul className="mt-4 space-y-2">{workItems.map((item) => <li key={item.id}><Link href={`/work-items/${item.id}`}>{item.title} - {item.customer?.name}</Link></li>)}</ul></div>
}

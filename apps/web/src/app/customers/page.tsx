import Link from 'next/link'
import { db } from '@/src/lib/db'

export default async function CustomersPage() {
  const customers = await db.customer.findMany({ orderBy: { createdAt: 'desc' } })
  return <div><h1 className="text-3xl font-bold">Customers</h1><ul className="mt-4 space-y-2">{customers.map((customer) => <li key={customer.id}><Link href={`/customers/${customer.id}`}>{customer.name}</Link></li>)}</ul></div>
}

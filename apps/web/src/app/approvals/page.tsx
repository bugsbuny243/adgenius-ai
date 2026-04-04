import { db } from '@/src/lib/db'

export default async function ApprovalsPage() {
  const approvals = await db.approval.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' } })
  return <div className="space-y-4"><h1 className="text-3xl font-semibold">Approvals</h1><ul>{approvals.map((a) => <li key={a.id}>{a.title}</li>)}</ul></div>
}

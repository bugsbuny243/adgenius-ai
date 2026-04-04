import { NextResponse } from 'next/server'
import { db } from '@/src/lib/db'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const agent = await db.agent.findUnique({ where: { id }, include: { runs: { take: 20, orderBy: { createdAt: 'desc' } } } })
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ agent })
}

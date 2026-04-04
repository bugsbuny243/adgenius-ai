import { NextResponse } from 'next/server'
import { db } from '@/src/lib/db'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.run.update({ where: { id }, data: { status: 'PROCESSING' } })
  await db.runStep.create({ data: { runId: id, stepType: 'RESUME', title: 'Run resumed after approval decision' } })
  return NextResponse.json({ ok: true })
}

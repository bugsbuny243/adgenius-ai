import { NextResponse } from 'next/server'
import { applyApprovedRun } from '@/src/server/services/agent-runtime'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await applyApprovedRun(id, 'demo-user')
  return NextResponse.json({ ok: true, result })
}

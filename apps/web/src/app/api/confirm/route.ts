import { NextResponse } from 'next/server'
import { getSessionUser } from '@/src/lib/auth'
import { confirmExtraction } from '@/src/server/services/persistence-service'

export async function POST(req: Request) {
  const user = await getSessionUser()
  const body = await req.json()
  const result = await confirmExtraction({ ...body, ownerId: user.id })
  return NextResponse.json(result)
}

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/src/lib/auth'
import { processIntake } from '@/src/server/services/intake-service'

export async function POST(req: Request) {
  const data = await req.formData()
  const files = data.getAll('files').filter((f): f is File => f instanceof File)
  const freeText = String(data.get('freeText') ?? '')
  const user = await getSessionUser()
  const extractionId = await processIntake({ ownerId: user.id, freeText, files })
  return NextResponse.json({ extractionId })
}

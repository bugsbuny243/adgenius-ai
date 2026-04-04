'use server'

import { redirect } from 'next/navigation'
import { getSessionUser } from '@/src/lib/auth'
import { processIntake } from '@/src/server/services/intake-service'

export async function submitUpload(formData: FormData) {
  const user = await getSessionUser()
  const freeText = String(formData.get('freeText') ?? '')
  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0)
  const extractionId = await processIntake({ ownerId: user.id, freeText, files })
  redirect(`/ai-results/${extractionId}`)
}

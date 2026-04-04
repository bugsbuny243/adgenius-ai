import { NextResponse } from 'next/server'
import { uploadAsset } from '@/src/lib/storage'
import { db } from '@/src/lib/db'

const ORG_ID = 'demo-org'

export async function POST(req: Request) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  const agentId = String(form.get('agentId') ?? '')
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

  const upload = await uploadAsset(file)
  const source = await db.knowledgeSource.create({
    data: {
      organizationId: ORG_ID,
      agentId: agentId || null,
      title: file.name,
      mimeType: file.type || 'application/octet-stream',
      storageKey: upload.storageKey,
      sourceUrl: upload.sourceUrl,
      extractedText: `Uploaded file: ${file.name}`,
    },
  })

  return NextResponse.json({ source }, { status: 201 })
}

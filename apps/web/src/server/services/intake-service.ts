import { AssetType } from '@prisma/client'
import { db } from '@/src/lib/db'
import { runGeminiExtraction } from '@/src/lib/gemini'
import { uploadAsset } from '@/src/lib/storage'

type IntakeInput = {
  ownerId: string
  freeText?: string
  files: File[]
}

function toAssetType(mimeType: string): AssetType {
  if (mimeType.includes('pdf')) return AssetType.PDF
  if (mimeType.includes('image')) return AssetType.IMAGE
  if (mimeType.includes('audio')) return AssetType.AUDIO
  if (mimeType.includes('text') || mimeType.includes('word')) return AssetType.DOCUMENT
  return AssetType.DOCUMENT
}

export async function processIntake(input: IntakeInput) {
  const aiRun = await db.aiRun.create({
    data: {
      ownerId: input.ownerId,
      model: 'gemini-2.5-pro',
      promptVersion: 'v1.0',
      sourceText: input.freeText,
      status: 'PROCESSING',
    },
  })

  const assets = [] as Array<{ id: string; text: string }>
  for (const file of input.files) {
    const uploaded = await uploadAsset(file)
    const buffer = Buffer.from(await file.arrayBuffer())
    const contentSnippet = buffer.toString('utf-8').slice(0, 8000)
    const asset = await db.asset.create({
      data: {
        ownerId: input.ownerId,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        type: toAssetType(file.type || ''),
        storageKey: uploaded.storageKey,
        sourceUrl: uploaded.sourceUrl,
        textContent: contentSnippet,
        aiRuns: { connect: { id: aiRun.id } },
      },
    })
    assets.push({ id: asset.id, text: contentSnippet })
  }

  const extractionInput = [input.freeText ?? '', ...assets.map((a) => a.text)].join('\n\n')

  const result = await runGeminiExtraction(extractionInput)

  const extraction = await db.aiExtraction.create({
    data: {
      aiRunId: aiRun.id,
      customerName: result.parsed.customerName,
      workTitle: result.parsed.workTitle,
      summary: result.parsed.summary,
      keyDates: result.parsed.keyDates,
      taskList: result.parsed.taskList,
      riskFlags: result.parsed.riskFlags,
      missingInformation: result.parsed.missingInformation,
      nextActions: result.parsed.nextActions,
      rawOutput: result.raw as object,
    },
  })

  await db.aiRun.update({
    where: { id: aiRun.id },
    data: { status: 'REVIEW' },
  })

  return extraction.id
}

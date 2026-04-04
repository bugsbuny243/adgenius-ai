import { NextResponse } from 'next/server'
import { db } from '@/src/lib/db'
import { executeAgentRun } from '@/src/server/services/agent-runtime'

const ORG_ID = 'demo-org'
const USER_ID = 'demo-user'

export async function POST(req: Request) {
  const body = await req.json()

  const run = await db.run.create({
    data: {
      organizationId: ORG_ID,
      agentId: body.agentId,
      startedById: USER_ID,
      status: 'PROCESSING',
      inputText: body.inputText,
      knowledgeSourceId: body.knowledgeSourceId,
    },
  })

  const knowledge = body.knowledgeSourceId
    ? await db.knowledgeSource.findUnique({ where: { id: body.knowledgeSourceId } })
    : null

  const result = await executeAgentRun({
    runId: run.id,
    organizationId: ORG_ID,
    agentId: body.agentId,
    userId: USER_ID,
    inputText: body.inputText ?? '',
    knowledgeText: knowledge?.extractedText ?? undefined,
  })

  return NextResponse.json(result, { status: 201 })
}

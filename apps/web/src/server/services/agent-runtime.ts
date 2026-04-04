import { db } from '@/src/lib/db'
import { extractOperationalData } from '@/src/lib/gemini'

type RuntimeInput = {
  runId: string
  organizationId: string
  agentId: string
  userId?: string
  inputText: string
  knowledgeText?: string
}

export async function executeAgentRun(input: RuntimeInput) {
  await db.runStep.create({
    data: {
      runId: input.runId,
      stepType: 'INGEST',
      title: 'Input accepted',
      detail: 'Runtime accepted text + optional file-derived text.',
    },
  })

  const combinedInput = [input.inputText, input.knowledgeText].filter(Boolean).join('\n\n')
  const extraction = await extractOperationalData(combinedInput)

  await db.run.update({
    where: { id: input.runId },
    data: {
      status: 'WAITING_APPROVAL',
      extraction: extraction as object,
      summary: extraction.summary,
      risks: extraction.risks,
      missingFields: extraction.missingFields,
      proposedTasks: extraction.tasks as object,
    },
  })

  await db.runStep.create({
    data: {
      runId: input.runId,
      stepType: 'EXTRACTION',
      title: 'Gemini extraction complete',
      payload: extraction as object,
    },
  })

  const approval = await db.approval.create({
    data: {
      organizationId: input.organizationId,
      runId: input.runId,
      title: 'Create business records from extraction',
      summary: extraction.summary,
      payload: extraction as object,
    },
  })

  await db.runStep.create({
    data: {
      runId: input.runId,
      stepType: 'APPROVAL',
      title: 'Approval requested',
      detail: approval.id,
    },
  })

  return { runId: input.runId, approvalId: approval.id, extraction }
}

export async function applyApprovedRun(runId: string, approvedById?: string) {
  const run = await db.run.findUniqueOrThrow({ where: { id: runId }, include: { approvals: true } })
  const payload = run.extraction as Record<string, any>

  const customer = payload.customer?.name
    ? await db.customer.create({
        data: {
          organizationId: run.organizationId,
          name: payload.customer.name,
          email: payload.customer.email,
        },
      })
    : null

  const workItem = payload.workItem?.title
    ? await db.workItem.create({
        data: {
          organizationId: run.organizationId,
          customerId: customer?.id,
          title: payload.workItem.title,
          summary: payload.workItem.summary,
          sourceRunId: run.id,
        },
      })
    : null

  if (Array.isArray(payload.tasks) && payload.tasks.length > 0) {
    await db.task.createMany({
      data: payload.tasks.map((task: any) => ({
        organizationId: run.organizationId,
        title: task.title,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        workItemId: workItem?.id,
        sourceRunId: run.id,
      })),
    })
  }

  if (payload.note) {
    await db.note.create({
      data: {
        organizationId: run.organizationId,
        body: payload.note,
        customerId: customer?.id,
        workItemId: workItem?.id,
        sourceRunId: run.id,
      },
    })
  }

  await db.timeline.create({
    data: {
      organizationId: run.organizationId,
      title: 'Run approved and records created',
      detail: run.summary,
      customerId: customer?.id,
      workItemId: workItem?.id,
      sourceRunId: run.id,
    },
  })

  await db.approval.updateMany({
    where: { runId, status: 'PENDING' },
    data: { status: 'APPROVED', approvedAt: new Date(), approvedById },
  })

  await db.run.update({ where: { id: runId }, data: { status: 'COMPLETED', output: payload } })
  await db.runStep.create({ data: { runId, stepType: 'PERSIST', title: 'Business records created' } })

  return { workItemId: workItem?.id, customerId: customer?.id }
}

import { db } from '@/src/lib/db'

type ConfirmPayload = {
  extractionId: string
  ownerId: string
  customerName: string
  workTitle: string
  summary: string
  taskList: Array<{ title: string; dueDate: string | null }>
  keyDates: Array<{ label: string; date: string }>
}

export async function confirmExtraction(payload: ConfirmPayload) {
  const extraction = await db.aiExtraction.findUniqueOrThrow({
    where: { id: payload.extractionId },
    include: { aiRun: true },
  })

  const customer = await db.customer.upsert({
    where: { id: `${payload.ownerId}-${payload.customerName}` },
    update: { name: payload.customerName },
    create: {
      id: `${payload.ownerId}-${payload.customerName}`,
      ownerId: payload.ownerId,
      name: payload.customerName,
    },
  })

  const workItem = await db.workItem.create({
    data: {
      ownerId: payload.ownerId,
      customerId: customer.id,
      title: payload.workTitle,
      summary: payload.summary,
      aiRuns: { connect: { id: extraction.aiRunId } },
    },
  })

  if (payload.taskList.length) {
    await db.task.createMany({
      data: payload.taskList.map((task) => ({
        ownerId: payload.ownerId,
        workItemId: workItem.id,
        title: task.title,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
      })),
    })
  }

  for (const dateItem of payload.keyDates) {
    await db.timeline.create({
      data: {
        ownerId: payload.ownerId,
        customerId: customer.id,
        workItemId: workItem.id,
        title: dateItem.label,
        eventDate: new Date(dateItem.date),
        kind: 'deadline',
      },
    })
  }

  await db.note.create({
    data: {
      ownerId: payload.ownerId,
      workItemId: workItem.id,
      customerId: customer.id,
      body: payload.summary,
    },
  })

  await db.aiRun.update({
    where: { id: extraction.aiRunId },
    data: { status: 'CONFIRMED', workItemId: workItem.id },
  })

  return { workItemId: workItem.id, customerId: customer.id }
}

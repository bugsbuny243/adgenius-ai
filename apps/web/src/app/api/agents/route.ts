import { NextResponse } from 'next/server'
import { db } from '@/src/lib/db'

const ORG_ID = 'demo-org'

export async function GET() {
  const agents = await db.agent.findMany({ where: { organizationId: ORG_ID }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ agents })
}

export async function POST(req: Request) {
  const body = await req.json()
  const agent = await db.agent.create({
    data: {
      organizationId: ORG_ID,
      name: body.name,
      description: body.description,
      instructions: body.instructions ?? 'Extract structured records and ask approval before writes.',
      templateId: body.templateId,
    },
  })
  return NextResponse.json({ agent }, { status: 201 })
}

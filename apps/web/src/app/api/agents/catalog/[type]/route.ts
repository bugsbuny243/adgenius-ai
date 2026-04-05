import { NextResponse } from 'next/server';

import { fetchAgentType } from '@/lib/server/app-data';

export async function GET(request: Request, context: { params: Promise<{ type: string }> }) {
  try {
    const { type } = await context.params;
    const agent = await fetchAgentType(request, type);

    if (!agent) {
      return NextResponse.json({ error: 'Agent türü bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json({ item: agent });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Agent detayı alınamadı.' }, { status: 400 });
  }
}

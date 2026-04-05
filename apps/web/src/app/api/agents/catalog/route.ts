import { NextResponse } from 'next/server';

import { fetchAgentCatalog } from '@/lib/server/app-data';

export async function GET(request: Request) {
  try {
    const data = await fetchAgentCatalog(request);
    return NextResponse.json({ items: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Agent listesi alınamadı.' }, { status: 400 });
  }
}

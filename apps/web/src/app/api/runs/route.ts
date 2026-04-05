import { NextResponse } from 'next/server';

import { fetchRuns } from '@/lib/server/app-data';

export async function GET(request: Request) {
  try {
    const data = await fetchRuns(request);
    return NextResponse.json({ items: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Run geçmişi alınamadı.' }, { status: 400 });
  }
}

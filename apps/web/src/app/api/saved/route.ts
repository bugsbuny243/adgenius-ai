import { NextResponse } from 'next/server';

import { fetchSaved } from '@/lib/server/app-data';

export async function GET(request: Request) {
  try {
    const data = await fetchSaved(request);
    return NextResponse.json({ items: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Saved listesi alınamadı.' }, { status: 400 });
  }
}

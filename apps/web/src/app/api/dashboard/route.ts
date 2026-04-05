import { NextResponse } from 'next/server';

import { fetchDashboardData } from '@/lib/server/app-data';

export async function GET(request: Request) {
  try {
    const data = await fetchDashboardData(request);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Dashboard verisi alınamadı.' }, { status: 400 });
  }
}
